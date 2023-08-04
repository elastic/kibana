/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import './saved_search_grid.scss';
import { SavedSearch } from '@kbn/saved-search-plugin/common';
import { DiscoverGridFlyout } from '../components/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

export interface DiscoverGridEmbeddableProps extends UnifiedDataTableProps {
  totalHitCount: number;
  query?: AggregateQuery | Query;
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  savedSearch?: SavedSearch;
}

export const DataGridMemoized = memo(UnifiedDataTable);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={props.totalHitCount}
      isLoading={props.isLoading}
      dataTestSubj="embeddedSavedSearchDocTable"
    >
      <DataGridMemoized
        {...props}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        getDocumentView={(displayedRows: DataTableRecord[], displayedColumns: string[]) => {
          return (
            expandedDoc && (
              <DiscoverGridFlyout
                dataView={props.dataView}
                hit={expandedDoc}
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
            )
          );
        }}
      />
    </SavedSearchEmbeddableBase>
  );
}
