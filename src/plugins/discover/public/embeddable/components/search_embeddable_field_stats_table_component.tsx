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
import type { SearchEmbeddableApi } from '../types';

interface SavedSearchEmbeddableComponentProps {
  onAddFilter: DocViewFilterFn;
  api: SearchEmbeddableApi & {
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
  };
}

export function SearchEmbeddablFieldStatsTableComponent({
  api,
  onAddFilter,
}: SavedSearchEmbeddableComponentProps) {
  const [fetchContext, dataViews, columns] = useBatchedPublishingSubjects(
    api.fetchContext$,
    api.dataViews,
    api.columns$
  );

  const dataView = useMemo(() => {
    return dataViews?.[0];
  }, [dataViews]);

  if (!dataView) return <></>;

  return (
    <FieldStatisticsTable
      dataView={dataView}
      columns={columns ?? []}
      savedSearch={api.getSavedSearch()}
      filters={fetchContext?.filters}
      query={fetchContext?.query}
      onAddFilter={onAddFilter}
      searchSessionId={fetchContext?.searchSessionId}
      // isEsqlMode={isEsqlMode}
    />
  );
}
