/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter, Query, AggregateQuery, isOfAggregateQueryType } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useFlyoutActions } from './use_flyout_actions';
import { useDiscoverCustomization } from '../../customizations';
import { DiscoverGridFlyoutActions } from './discover_grid_flyout_actions';

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
  setExpandedDoc: (doc?: DataTableRecord) => void;
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
}: DiscoverGridFlyoutProps) {
  const services = useDiscoverServices();
  const flyoutCustomization = useDiscoverCustomization('flyout');
  const isESQLQuery = isOfAggregateQueryType(query);

  const { flyoutActions } = useFlyoutActions({
    actions: flyoutCustomization?.actions,
    dataView,
    rowIndex: hit.raw._index,
    rowId: hit.raw._id,
    columns,
    filters,
    savedSearchId,
  });

  return (
    <UnifiedDocViewerFlyout
      flyoutTitle={flyoutCustomization?.title}
      flyoutDefaultWidth={flyoutCustomization?.size}
      flyoutActions={
        !isESQLQuery && flyoutActions.length > 0 ? (
          <DiscoverGridFlyoutActions flyoutActions={flyoutActions} />
        ) : null
      }
      flyoutWidthLocalStorageKey={FLYOUT_WIDTH_KEY}
      FlyoutCustomBody={flyoutCustomization?.Content}
      services={services}
      docViewsRegistry={flyoutCustomization?.docViewsRegistry}
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
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverGridFlyout;
