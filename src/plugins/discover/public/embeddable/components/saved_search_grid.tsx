/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { MAX_DOC_FIELDS_DISPLAYED, ROW_HEIGHT_OPTION, SHOW_MULTIFIELDS } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import {
  columnActions,
  DataLoadingState as DiscoverGridLoadingState,
  getRenderCustomToolbarWithElements,
  type DataTableColumnsMeta,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import React, { useCallback, useMemo, useState } from 'react';
import { TotalDocuments } from '../../application/main/components/total_documents/total_documents';
import { DiscoverGrid } from '../../components/discover_grid';
import { DiscoverGridFlyout } from '../../components/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';
import './saved_search_grid.scss';

export interface DiscoverGridEmbeddableProps
  extends Omit<UnifiedDataTableProps, 'sampleSizeState'> {
  sampleSizeState: number; // a required prop
  totalHitCount?: number;
  query?: AggregateQuery | Query;
  interceptedWarnings?: SearchResponseWarning[];
  savedSearchId?: string;

  onSetColumns: (columns: string[]) => void;
}

export type DiscoverGridEmbeddableSearchProps = Omit<
  DiscoverGridEmbeddableProps,
  'sampleSizeState' | 'loadingState' | 'query'
>;

export const DiscoverGridMemoized = React.memo(DiscoverGrid);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const { interceptedWarnings, onSetColumns, ...gridProps } = props;
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const onAddColumn = useCallback(
    (columnName: string) => {
      if (!props.columns) {
        return;
      }
      const updatedColumns = columnActions.addColumn(props.columns, columnName, true);
      onSetColumns(updatedColumns);
    },
    [props.columns, onSetColumns]
  );

  const onRemoveColumn = useCallback(
    (columnName: string) => {
      if (!props.columns) {
        return;
      }
      const updatedColumns = columnActions.removeColumn(props.columns, columnName, true);
      onSetColumns(updatedColumns);
    },
    [props.columns, onSetColumns]
  );

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <DiscoverGridFlyout
        dataView={props.dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        savedSearchId={props.savedSearchId}
        onFilter={props.onFilter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={props.query}
      />
    ),
    [props.dataView, props.onFilter, onRemoveColumn, props.query, props.savedSearchId, onAddColumn]
  );

  const renderCustomToolbarWithElements = useMemo(
    () =>
      getRenderCustomToolbarWithElements({
        leftSide:
          typeof props.totalHitCount === 'number' ? (
            <TotalDocuments totalHitCount={props.totalHitCount} />
          ) : undefined,
      }),
    [props.totalHitCount]
  );

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={undefined} // it will be rendered inside the custom grid toolbar instead
      isLoading={props.loadingState === DiscoverGridLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
    >
      <DiscoverGridMemoized
        {...gridProps}
        onSetColumns={onSetColumns}
        totalHits={props.totalHitCount}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        configRowHeight={props.services.uiSettings.get(ROW_HEIGHT_OPTION)}
        showMultiFields={props.services.uiSettings.get(SHOW_MULTIFIELDS)}
        maxDocFieldsDisplayed={props.services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
        renderDocumentView={renderDocumentView}
        renderCustomToolbar={renderCustomToolbarWithElements}
        enableComparisonMode
        showColumnTokens
        configHeaderRowHeight={3}
        showFullScreenButton={false}
        className="unifiedDataTable"
      />
    </SavedSearchEmbeddableBase>
  );
}
