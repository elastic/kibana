/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { FetchContext, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';

import { FieldStatisticsTable } from '../../application/main/components/field_stats_table';
import type { SearchEmbeddableStateManager, SearchEmbeddableApi } from '../types';
import { isEsqlMode } from '../initialize_fetch';

interface SavedSearchEmbeddableComponentProps {
  api: SearchEmbeddableApi & {
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
  };
  onAddFilter: DocViewFilterFn;
  stateManager: SearchEmbeddableStateManager;
}

export function SearchEmbeddablFieldStatsTableComponent({
  api,
  onAddFilter,
  stateManager,
}: SavedSearchEmbeddableComponentProps) {
  const [fetchContext, dataViews, savedSearch, columns] = useBatchedPublishingSubjects(
    api.fetchContext$,
    api.dataViews,
    api.savedSearch$,
    stateManager.columns
  );

  const dataView = useMemo(() => {
    return dataViews?.[0];
  }, [dataViews]);

  const isEsql = useMemo(() => isEsqlMode(savedSearch), [savedSearch]);

  if (!dataView) return <></>;
  return (
    <FieldStatisticsTable
      dataView={dataView}
      columns={columns ?? []}
      savedSearch={savedSearch}
      filters={fetchContext?.filters}
      query={fetchContext?.query}
      onAddFilter={onAddFilter}
      searchSessionId={fetchContext?.searchSessionId}
      isEsqlMode={isEsql}
    />
  );
}
