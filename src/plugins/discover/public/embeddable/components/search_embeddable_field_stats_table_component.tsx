/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import { FetchContext, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { FieldStatisticsTable } from '../../application/main/components/field_stats_table';
import { isEsqlMode } from '../initialize_fetch';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
import { useDiscoverServices } from '../../hooks/use_discover_services';

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
  const services = useDiscoverServices();

  // Quit early if we know it's in ES|QL mode
  if (isEsql && services.dataVisualizer?.FieldStatsUnavailableMessage) {
    return <services.dataVisualizer.FieldStatsUnavailableMessage />;
  }

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
