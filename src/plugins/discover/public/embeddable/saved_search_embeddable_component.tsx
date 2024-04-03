/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { AggregateQuery, Query } from '@kbn/es-query';
import { DataLoadingState } from '@kbn/unified-data-table';
import { DiscoverGridEmbeddable } from './saved_search_grid';
import { DiscoverDocTableEmbeddable } from '../components/doc_table/create_doc_table_embeddable';
import { isTextBasedQuery } from '../application/main/utils/is_text_based_query';
import type { EmbeddableComponentSearchProps } from './types';

interface SavedSearchEmbeddableComponentProps {
  fetchedSampleSize: number;
  searchProps: EmbeddableComponentSearchProps;
  useLegacyTable: boolean;
  query?: AggregateQuery | Query;
}

const DiscoverDocTableEmbeddableMemoized = React.memo(DiscoverDocTableEmbeddable);
const DiscoverGridEmbeddableMemoized = React.memo(DiscoverGridEmbeddable);

export function SavedSearchEmbeddableComponent({
  fetchedSampleSize,
  searchProps,
  useLegacyTable,
  query,
}: SavedSearchEmbeddableComponentProps) {
  if (useLegacyTable) {
    const isPlainRecord = isTextBasedQuery(query);
    return (
      <DiscoverDocTableEmbeddableMemoized
        {...searchProps}
        sampleSizeState={fetchedSampleSize}
        isPlainRecord={isPlainRecord}
      />
    );
  }
  return (
    <DiscoverGridEmbeddableMemoized
      {...searchProps}
      sampleSizeState={fetchedSampleSize}
      loadingState={searchProps.isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
      query={query}
    />
  );
}
