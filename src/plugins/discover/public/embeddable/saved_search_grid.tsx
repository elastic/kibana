/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchResponseInterceptedWarning } from '@kbn/search-response-warnings';
import {
  DataLoadingState as DiscoverGridLoadingState,
  UnifiedDataTable,
} from '@kbn/unified-data-table';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import './saved_search_grid.scss';
import { SavedSearch } from '@kbn/saved-search-plugin/common';
import { MAX_DOC_FIELDS_DISPLAYED, ROW_HEIGHT_OPTION, SHOW_MULTIFIELDS } from '@kbn/discover-utils';
import { DiscoverGridFlyout } from '../components/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

export interface DiscoverGridEmbeddableProps extends UnifiedDataTableProps {
  totalHitCount?: number;
  query?: AggregateQuery | Query;
  interceptedWarnings?: SearchResponseInterceptedWarning[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  savedSearch?: SavedSearch;
}

export const DataGridMemoized = memo(UnifiedDataTable);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const { interceptedWarnings, ...gridProps } = props;
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const renderDocumentView = useCallback(
    (hit: DataTableRecord, displayedRows: DataTableRecord[], displayedColumns: string[]) => (
      <DiscoverGridFlyout
        dataView={props.dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        savedSearchId={props.savedSearch?.id}
        onFilter={props.onFilter}
        onRemoveColumn={props.onRemoveColumn}
        onAddColumn={props.onAddColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={props.query}
      />
    ),
    [
      props.dataView,
      props.onAddColumn,
      props.onFilter,
      props.onRemoveColumn,
      props.query,
      props.savedSearch?.id,
    ]
  );

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={props.totalHitCount}
      isLoading={props.loadingState === DiscoverGridLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
    >
      <DataGridMemoized
        {...gridProps}
        totalHits={props.totalHitCount}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        configRowHeight={props.services.uiSettings.get(ROW_HEIGHT_OPTION)}
        showMultiFields={props.services.uiSettings.get(SHOW_MULTIFIELDS)}
        maxDocFieldsDisplayed={props.services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
        renderDocumentView={renderDocumentView}
      />
    </SavedSearchEmbeddableBase>
  );
}
