/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import type { DocViewerProps, DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useFlyoutActions } from './use_flyout_actions';
import { useDiscoverCustomization } from '../../customizations';
import { DiscoverGridFlyoutActions } from './discover_grid_flyout_actions';
import { useProfileAccessor } from '../../context_awareness';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { SPAN_OVERVIEW_CUE_FEATURE_FLAG_KEY, TRANSACTION_OVERVIEW_CUE_FEATURE_FLAG_KEY } from '../../constants';
import { FlyoutCue } from '../../application/main/components/observability_cues/flyout_cue';

export const FLYOUT_WIDTH_KEY = 'discover:flyoutWidth';

export interface DiscoverGridFlyoutProps {
  savedSearchId?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter?: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setExpandedDoc: (doc?: DataTableRecord, options?: { initialTabId?: string }) => void;
  initialTabId?: string;
  docViewerRef?: DocViewerProps['ref'];
  // Demo state props
  demoCanManageSpaces?: boolean;
  demoIsTrial?: boolean;
}

/**
 * Flyout displaying an expanded Elasticsearch document
 */
export function DiscoverGridFlyout({
  hit,
  hits,
  dataView,
  columns,
  columnsMeta,
  savedSearchId,
  filters,
  query,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  setExpandedDoc,
  initialTabId,
  docViewerRef,
  demoCanManageSpaces,
  demoIsTrial,
}: DiscoverGridFlyoutProps) {
  const services = useDiscoverServices();
  const flyoutCustomization = useDiscoverCustomization('flyout');
  const isESQLQuery = isOfAggregateQueryType(query);
  // Get actual hit with updated highlighted searches
  const actualHit = useMemo(() => hits?.find(({ id }) => id === hit?.id) || hit, [hit, hits]);

  const { flyoutActions } = useFlyoutActions({
    actions: flyoutCustomization?.actions,
    dataView,
    rowIndex: actualHit.raw._index,
    rowId: actualHit.raw._id,
    columns,
    filters,
    savedSearchId,
  });

  const getDocViewerAccessor = useProfileAccessor('getDocViewer', {
    record: actualHit,
  });
  const docViewer = useMemo(() => {
    const getDocViewer = getDocViewerAccessor(() => ({
      title: flyoutCustomization?.title,
      docViewsRegistry: (registry: DocViewsRegistry) =>
        typeof flyoutCustomization?.docViewsRegistry === 'function'
          ? flyoutCustomization.docViewsRegistry(registry)
          : registry,
    }));

    return getDocViewer({ record: actualHit });
  }, [getDocViewerAccessor, actualHit, flyoutCustomization]);

  useEffect(() => {
    dismissAllFlyoutsExceptFor(DiscoverFlyouts.docViewer);
  }, []);

  // Span detection logic for flyout banner
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Get current solution type
  const activeSpace$ = useMemo(
    () => services.spaces?.getActiveSpace$() ?? of(undefined),
    [services.spaces]
  );
  const activeSpace = useObservable(activeSpace$);
  const solutionType = activeSpace?.solution;

  // Check if feature flags are enabled
  const isSpanFeatureEnabled = services.core.featureFlags.getBooleanValue(
    SPAN_OVERVIEW_CUE_FEATURE_FLAG_KEY,
    true
  );
  const isTransactionFeatureEnabled = services.core.featureFlags.getBooleanValue(
    TRANSACTION_OVERVIEW_CUE_FEATURE_FLAG_KEY,
    true
  );

  // Check if user can manage spaces
  const canManageSpaces = services.application.capabilities.spaces?.manage ?? false;

  // Check if current license is a trial
  const isTrial = services.licensing?.license?.type === 'trial';

  // Check if APM feature is enabled (either span or transaction)
  const isApmFeatureEnabled = isSpanFeatureEnabled || isTransactionFeatureEnabled;

  // Get conditional callout message based on trial status
  const getCalloutMessage = useCallback(() => {
    if (isTrial) {
      return 'Switching to the Observability view unlocks tailored tools and workflows for your data.';
    } else {
      return 'Switching to the Observability view unlocks tailored tools and workflows for everyone in this space.';
    }
  }, [isTrial]);

  // Handle switch to Observability
  const handleSwitchToObservability = useCallback(async () => {
    try {
      const activeSpace = await services.spaces?.getActiveSpace();
      if (!activeSpace) {
        return;
      }

      const updatedSpace = {
        ...activeSpace,
        solution: 'oblt' as const,
      };

      await services.http.put(`/api/spaces/space/${encodeURIComponent(activeSpace.id)}`, {
        query: { overwrite: true },
        body: JSON.stringify(updatedSpace),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('showObservabilityTour', 'true');
      window.location.href = currentUrl.toString();
    } catch (error) {
      const currentSpace = await services.spaces?.getActiveSpace();
      if (currentSpace) {
        services.application.navigateToUrl(
          services.addBasePath(`/app/management/kibana/spaces/edit/${currentSpace.id}`)
        );
      }
    }
  }, [services]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Create banner if conditions are met
  const banner = useMemo(() => {
    // Only show banner if not in Observability view and feature is enabled
    if (solutionType !== 'oblt' && isApmFeatureEnabled) {
      return <FlyoutCue document={actualHit} demoCanManageSpaces={demoCanManageSpaces} demoIsTrial={demoIsTrial} />;
    }

    return null;
  }, [solutionType, isApmFeatureEnabled, actualHit, demoCanManageSpaces, demoIsTrial]);

  return (
    <UnifiedDocViewerFlyout
      flyoutTitle={docViewer.title}
      flyoutDefaultWidth={flyoutCustomization?.size}
      flyoutActions={
        !isESQLQuery && flyoutActions.length > 0 ? (
          <DiscoverGridFlyoutActions flyoutActions={flyoutActions} />
        ) : null
      }
      flyoutWidthLocalStorageKey={FLYOUT_WIDTH_KEY}
      banner={banner}
      FlyoutCustomBody={flyoutCustomization?.Content}
      services={services}
      docViewsRegistry={docViewer.docViewsRegistry}
      isEsqlQuery={isESQLQuery}
      hit={hit}
      hits={hits}
      dataView={dataView}
      columns={columns}
      columnsMeta={columnsMeta}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      onClose={onClose}
      onFilter={onFilter}
      setExpandedDoc={setExpandedDoc}
      initialTabId={initialTabId}
      docViewerRef={docViewerRef}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverGridFlyout;
