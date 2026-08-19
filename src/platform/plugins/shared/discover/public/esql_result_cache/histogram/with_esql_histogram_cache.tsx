/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type ComponentType,
  type ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { InPortal, OutPortal } from 'react-reverse-portal';
import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import { useDiscoverCustomizationContext } from '../../customizations';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import {
  selectTabCombinedFilters,
  useAppStateSelector,
  useCurrentDataView,
  useCurrentTabSelector,
  useInternalStateSelector,
} from '../../application/main/state_management/redux';
import { getDefinedControlGroupState } from '../../application/main/state_management/utils/get_defined_control_group_state';
import { useUnifiedHistogramCommon } from '../../application/main/components/chart/use_unified_histogram_common';
import { useUnifiedHistogramRuntimeState } from '../../application/main/components/chart/use_unified_histogram_runtime_state';
import { getEsqlHistogramFingerprint, isEsqlHistogramCacheEligible } from './policy';
import type { CachedHistogramAttachment, EsqlHistogramCache } from './cache';
import { type DiscoverUnifiedHistogramProps, getHistogramProps } from './props';

export interface EsqlHistogramRendererProps {
  currentTabId: string;
  panelsToggle?: ReactElement;
  unifiedHistogramProps: DiscoverUnifiedHistogramProps;
}

const CachedHistogram = ({
  histogramFingerprint,
  currentTabId,
  panelsToggle,
  service,
  unifiedHistogramProps,
}: {
  histogramFingerprint: string;
  currentTabId: string;
  panelsToggle?: ReactElement;
  service: EsqlHistogramCache;
  unifiedHistogramProps: DiscoverUnifiedHistogramProps;
}) => {
  const [attachment, setAttachment] = useState<CachedHistogramAttachment>();
  const { setUnifiedHistogramApi } = unifiedHistogramProps;
  const histogramProps = useMemo(
    () => getHistogramProps(unifiedHistogramProps),
    [unifiedHistogramProps]
  );
  const histogramPropsRef = useRef(histogramProps);
  histogramPropsRef.current = histogramProps;
  const histogramFingerprintRef = useRef(histogramFingerprint);
  histogramFingerprintRef.current = histogramFingerprint;

  const serviceState = useSyncExternalStore(service.subscribe, service.getState, service.getState);
  const snapshot = serviceState.snapshots.get(currentTabId);

  useLayoutEffect(() => {
    const nextAttachment = service.attach({
      fingerprint: histogramFingerprintRef.current,
      props: histogramPropsRef.current,
      tabId: currentTabId,
    });
    setAttachment(nextAttachment);

    return () => service.detach(nextAttachment);
  }, [currentTabId, service]);

  useEffect(() => {
    if (attachment) {
      service.updateAttachment({
        attachment,
        fingerprint: histogramFingerprint,
        props: histogramProps,
      });
    }
  }, [attachment, histogramFingerprint, histogramProps, service]);

  useLayoutEffect(() => {
    if (attachment && snapshot?.generation === attachment.generation && snapshot.api) {
      setUnifiedHistogramApi(snapshot.api);
    }
  }, [attachment, setUnifiedHistogramApi, snapshot]);

  let layoutProps: UnifiedHistogramPartialLayoutProps | undefined;
  if (attachment && snapshot?.generation === attachment.generation) {
    layoutProps = snapshot.layoutProps;
  }

  useUnifiedHistogramCommon({
    currentTabId,
    layoutProps,
    panelsToggle: undefined,
  });

  if (!attachment || snapshot?.generation !== attachment.generation) {
    return null;
  }

  return (
    <>
      <InPortal node={attachment.routeActionsPortalNode}>{panelsToggle}</InPortal>
      <OutPortal node={snapshot.portalNode} />
    </>
  );
};

export const useReconcileEsqlHistogramCache = (openTabIds: readonly string[]) => {
  const { esqlResultCache } = useDiscoverServices();

  useEffect(() => {
    esqlResultCache.reconcileTabs(openTabIds);
  }, [esqlResultCache, openTabIds]);
};

export const withEsqlHistogramCache = (Histogram: ComponentType<EsqlHistogramRendererProps>) => {
  return function EsqlHistogramWithCache({ panelsToggle }: { panelsToggle?: ReactElement }) {
    const services = useDiscoverServices();
    const { histogram: service } = services.esqlResultCache;
    const { currentTabId, unifiedHistogramProps } = useUnifiedHistogramRuntimeState();
    const customization = useDiscoverCustomizationContext();
    const dataView = useCurrentDataView();
    const query = useAppStateSelector((state) => state.query);
    const interval = useAppStateSelector((state) => state.interval);
    const breakdownField = useAppStateSelector((state) => state.breakdownField);
    const chartHidden = useAppStateSelector((state) => state.hideChart);
    const isApproximate = useAppStateSelector((state) => state.isApproximate);
    const filters = useCurrentTabSelector(selectTabCombinedFilters);
    const controlGroupState = useCurrentTabSelector((tab) => tab.attributes.controlGroupState);
    const esqlVariables = useCurrentTabSelector((tab) => tab.esqlVariables);
    const timeRange = useCurrentTabSelector((tab) => tab.globalState.timeRange);
    const visContext = useCurrentTabSelector((tab) => tab.attributes.visContext);
    const isSearchSessionRestored = useCurrentTabSelector(
      (tab) => tab.dataRequestParams.isSearchSessionRestored
    );
    const persistedDiscoverSession = useInternalStateSelector(
      (state) => state.persistedDiscoverSession
    );
    const dataViewId = dataView?.id;
    const dataViewIndexPattern = dataView?.getIndexPattern();
    const timeFieldName = dataView?.timeFieldName;

    const canCache = isEsqlHistogramCacheEligible({
      breakdownField,
      chartHidden,
      displayMode: customization.displayMode,
      hasPersistedDiscoverSession: Boolean(persistedDiscoverSession),
      isEmbeddedEditor: services.embeddableEditor.isEmbeddedEditor(),
      isSearchSessionRestored,
      query,
      visContext,
    });

    const histogramFingerprint = useMemo(() => {
      if (!canCache || !isOfAggregateQueryType(query)) {
        return;
      }

      return getEsqlHistogramFingerprint({
        controlsState: getDefinedControlGroupState(controlGroupState),
        dataViewId,
        dataViewIndexPattern,
        esql: query.esql,
        esqlVariables,
        filters,
        interval,
        isApproximate,
        timeFieldName,
        timeRange,
      });
    }, [
      canCache,
      controlGroupState,
      dataViewId,
      dataViewIndexPattern,
      esqlVariables,
      filters,
      interval,
      isApproximate,
      query,
      timeFieldName,
      timeRange,
    ]);

    useEffect(() => {
      if (!histogramFingerprint) {
        service.disposeTab(currentTabId);
      }
    }, [currentTabId, histogramFingerprint, service]);

    if (!histogramFingerprint) {
      return (
        <Histogram
          currentTabId={currentTabId}
          panelsToggle={panelsToggle}
          unifiedHistogramProps={unifiedHistogramProps}
        />
      );
    }

    return (
      <CachedHistogram
        histogramFingerprint={histogramFingerprint}
        currentTabId={currentTabId}
        panelsToggle={panelsToggle}
        service={service}
        unifiedHistogramProps={unifiedHistogramProps}
      />
    );
  };
};
