/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
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
import type { DocViewerExtensionParams } from '../../context_awareness';
import { useProfileAccessor } from '../../context_awareness';

export const FLYOUT_WIDTH_KEY = 'discover:flyoutWidth';

export interface DiscoverGridFlyoutProps
  extends Pick<
    DocViewerProps,
    'initialDocViewerState' | 'onInitialDocViewerStateChange' | 'onUpdateSelectedTabId'
  > {
  savedSearchId?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  initialTabId?: string;
  docViewerRef?: DocViewerProps['ref'];
  docViewerExtensionActions?: DocViewerExtensionParams['actions'];
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter?: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setExpandedDoc: (
    doc?: DataTableRecord,
    options?: { initialTabId?: string; initialTabState?: object }
  ) => void;
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
  initialTabId,
  docViewerRef,
  docViewerExtensionActions,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  setExpandedDoc,
  initialDocViewerState,
  onInitialDocViewerStateChange,
  onUpdateSelectedTabId,
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

    return getDocViewer({ actions: docViewerExtensionActions ?? {}, record: actualHit });
  }, [actualHit, docViewerExtensionActions, flyoutCustomization, getDocViewerAccessor]);

  useEffect(() => {
    dismissAllFlyoutsExceptFor(DiscoverFlyouts.docViewer);
  }, []);

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
      initialDocViewerState={initialDocViewerState}
      onInitialDocViewerStateChange={onInitialDocViewerStateChange}
      onUpdateSelectedTabId={onUpdateSelectedTabId}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverGridFlyout;
