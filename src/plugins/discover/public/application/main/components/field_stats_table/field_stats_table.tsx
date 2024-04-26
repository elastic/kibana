/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { of, BehaviorSubject } from 'rxjs';
import type { Subscription } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FIELD_STATISTICS_LOADED } from './constants';
import type {
  NormalSamplingOption,
  FieldStatisticsTableEmbeddableState,
  FieldStatisticsTableEmbeddableApi,
  FieldStatisticsTableProps,
} from './types';
export type { FieldStatisticsTableProps };

const statsTableCss = css({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  '.kbnDocTableWrapper': {
    overflowX: 'hidden',
  },
});

export const FieldStatisticsTable = (props: FieldStatisticsTableProps) => {
  const {
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    searchSessionId,
  } = props;

  const totalHits = useObservable(stateContainer?.dataState.data$.totalHits$ ?? of(undefined));
  const totalDocuments = useMemo(() => totalHits?.result, [totalHits]);

  const services = useDiscoverServices();

  // State from Discover we want the embeddable to reflect
  const embeddableState$ = useMemo(
    () => new BehaviorSubject<FieldStatisticsTableEmbeddableState | undefined>(undefined),
    []
  );
  // Embeddable state exposed to external consumers like Discover
  const embeddableApiSubscription = useRef<Subscription | undefined>(undefined);

  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  useEffect(
    function syncChangesToEmbeddableState() {
      const availableFields$ = stateContainer?.dataState.data$.availableFields$;

      const refetch = stateContainer?.dataState.refetch$.subscribe(() => {
        if (embeddableState$) {
          embeddableState$.next({
            ...embeddableState$.getValue(),
            lastReloadRequestTime: Date.now(),
          });
        }
      });

      const fields = availableFields$?.subscribe(() => {
        if (embeddableState$ && !availableFields$?.getValue().error) {
          embeddableState$.next({
            ...embeddableState$.getValue(),
            fieldsToFetch: availableFields$?.getValue().fields,
          });
        }
      });

      return () => {
        refetch?.unsubscribe();
        fields?.unsubscribe();
        embeddableState$?.unsubscribe();
        embeddableApiSubscription.current?.unsubscribe();
      };
    },
    [embeddableState$, stateContainer]
  );

  const initialState = useMemo(() => {
    return {
      shouldGetSubfields: true,
      dataView,
      savedSearch,
      query,
      visibleFieldNames: columns,
      sessionId: searchSessionId,
      fieldsToFetch: stateContainer?.dataState.data$.availableFields$?.getValue().fields,
      totalDocuments,
      showPreviewByDefault,
      samplingOption: {
        mode: 'normal_sampling',
        shardSize: 5000,
        seed: searchSessionId,
      } as NormalSamplingOption,
    };
    // We just need a snapshot of initialState upon table mounting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (embeddableState$) {
      // Update embeddable whenever one of the important input changes
      embeddableState$.next({
        shouldGetSubfields: true,
        dataView,
        savedSearch,
        query,
        visibleFieldNames: columns,
        sessionId: searchSessionId,
        fieldsToFetch: stateContainer?.dataState.data$.availableFields$?.getValue().fields,
        totalDocuments,
        showPreviewByDefault,
        samplingOption: {
          mode: 'normal_sampling',
          shardSize: 5000,
          seed: searchSessionId,
        } as NormalSamplingOption,
      });
    }
  }, [
    embeddableState$,
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    searchSessionId,
    totalDocuments,
    stateContainer,
    showPreviewByDefault,
  ]);

  useEffect(() => {
    // Track should only be called once when component is loaded
    trackUiMetric?.(METRIC_TYPE.LOADED, FIELD_STATISTICS_LOADED);
  }, [trackUiMetric]);

  const embeddableApi = useRef<FieldStatisticsTableEmbeddableApi>();
  const parentApi = useMemo(() => {
    return {
      embeddableState$,
      // Overriding with data service from Discover because
      // in serverless, Discover's data might be a proxy
      // in which case the proxied version might be different
      overrideServices: { data: { ...services.data, applicationContext: 'discover' } },
      onAddFilter,
    };
  }, [embeddableState$, services.data, onAddFilter]);

  const handleEmbeddableApiReady = useCallback(
    (api: FieldStatisticsTableEmbeddableApi) => {
      embeddableApi.current = api;
      if (api) {
        embeddableApiSubscription.current = api.showDistributions$?.subscribe(
          (showDistributions?: boolean) => {
            if (showDistributions !== undefined && stateContainer) {
              stateContainer.appState.update({
                hideAggregatedPreview: !showDistributions,
              });
            }
          }
        );
      }
    },
    [stateContainer]
  );

  return (
    <EuiFlexItem css={statsTableCss}>
      <ReactEmbeddableRenderer<
        FieldStatisticsTableEmbeddableState,
        FieldStatisticsTableEmbeddableApi
      >
        maybeId={'discover_data_visualizer_grid'}
        type={'data_visualizer_grid'}
        onApiAvailable={handleEmbeddableApiReady}
        state={{
          // initialState of the embeddable to be serialized
          rawState: initialState,
        }}
        parentApi={parentApi}
        panelProps={{
          // @ts-expect-error
          css: css({
            height: 'auto',
            minHeight: 'auto',
          }),
          hideHeader: true,
          hideInspector: true,
          showShadow: false,
          showBorder: false,
        }}
      />
    </EuiFlexItem>
  );
};
