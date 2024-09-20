/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { MAX_DOC_FIELDS_DISPLAYED, SHOW_MULTIFIELDS } from '@kbn/discover-utils';
import {
  type UnifiedDataTableProps,
  type DataTableColumnsMeta,
  DataLoadingState as DiscoverGridLoadingState,
  getRenderCustomToolbarWithElements,
} from '@kbn/unified-data-table';
import { DiscoverGrid } from '../../components/discover_grid';
import './saved_search_grid.scss';
import { DiscoverGridFlyout } from '../../components/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';
import { TotalDocuments } from '../../application/main/components/total_documents/total_documents';
import { useProfileAccessor } from '../../context_awareness';

export interface DiscoverGridEmbeddableProps
  extends Omit<UnifiedDataTableProps, 'sampleSizeState'> {
  sampleSizeState: number; // a required prop
  totalHitCount?: number;
  query?: AggregateQuery | Query;
  interceptedWarnings?: SearchResponseWarning[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  savedSearchId?: string;
}

export type DiscoverGridEmbeddableSearchProps = Omit<
  DiscoverGridEmbeddableProps,
  'sampleSizeState' | 'loadingState' | 'query'
>;

export const DiscoverGridMemoized = React.memo(DiscoverGrid);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const { interceptedWarnings, ...gridProps } = props;

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

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
      props.savedSearchId,
    ]
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

  const getCellRenderersAccessor = useProfileAccessor('getCellRenderers');
  const cellRenderers = useMemo(() => {
    const getCellRenderers = getCellRenderersAccessor(() => ({}));
    return getCellRenderers({
      dataView: props.dataView,
      density: gridProps.dataGridDensityState,
      rowHeight: gridProps.rowHeightState,
    });
  }, [
    getCellRenderersAccessor,
    props.dataView,
    gridProps.dataGridDensityState,
    gridProps.rowHeightState,
  ]);

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={undefined} // it will be rendered inside the custom grid toolbar instead
      isLoading={props.loadingState === DiscoverGridLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
    >
      <DiscoverGridMemoized
        {...gridProps}
        isPaginationEnabled={!gridProps.isPlainRecord}
        totalHits={props.totalHitCount}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        showMultiFields={props.services.uiSettings.get(SHOW_MULTIFIELDS)}
        maxDocFieldsDisplayed={props.services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
        renderDocumentView={renderDocumentView}
        renderCustomToolbar={renderCustomToolbarWithElements}
        externalCustomRenderers={cellRenderers}
        enableComparisonMode
        showColumnTokens
        showFullScreenButton={false}
        className="unifiedDataTable"
      />
    </SavedSearchEmbeddableBase>
  );
}
