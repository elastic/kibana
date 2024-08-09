/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import { FetchContext, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';

import { FieldStatisticsTable } from '../../application/main/components/field_stats_table';
import { isEsqlMode } from '../initialize_fetch';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';

interface SavedSearchEmbeddableComponentProps {
  api: SearchEmbeddableApi & {
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
  };
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  stateManager: SearchEmbeddableStateManager;
}

export function SearchEmbeddablFieldStatsTableComponent({
  api,
  dataView,
  onAddFilter,
  stateManager,
}: SavedSearchEmbeddableComponentProps) {
  const [fetchContext, savedSearch] = useBatchedPublishingSubjects(
    api.fetchContext$,
    api.savedSearch$
  );

  const isEsql = useMemo(() => isEsqlMode(savedSearch), [savedSearch]);

  return (
    <FieldStatisticsTable
      dataView={dataView}
      columns={savedSearch.columns ?? []}
      savedSearch={savedSearch}
      filters={fetchContext?.filters}
      query={fetchContext?.query}
      onAddFilter={onAddFilter}
      searchSessionId={fetchContext?.searchSessionId}
      isEsqlMode={isEsql}
      timeRange={fetchContext?.timeRange}
    />
  );
}
