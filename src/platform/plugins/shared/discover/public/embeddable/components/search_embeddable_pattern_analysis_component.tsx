/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import type { FetchContext } from '@kbn/presentation-publishing';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { AiopsAppContextValue } from '@kbn/aiops-plugin/public/hooks/use_aiops_app_context';
import type { LogCategorizationEmbeddableProps } from '@kbn/aiops-plugin/public/components/log_categorization/log_categorization_for_embeddable/log_categorization_for_discover';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { SearchEmbeddableApi } from '../types';

interface SavedSearchEmbeddablePatternAnalysisComponentProps {
  api: SearchEmbeddableApi & {
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
  };
  dataView: DataView;
}

export function SearchEmbeddablePatternAnalysisComponent({
  api,
  dataView,
}: SavedSearchEmbeddablePatternAnalysisComponentProps) {
  const [fetchContext, savedSearch] = useBatchedPublishingSubjects(
    api.fetchContext$,
    api.savedSearch$
  );
  const services = useDiscoverServices();
  const aiopsService = services.aiops;

  // `savedSearch.searchSource` is kept up to date with the panel's query/filters/time range by
  // `updateSearchSource` (see `initialize_fetch.ts`), so it can be passed straight through, the
  // same way the documents grid does for its own fetch.
  // fetchContext changes whenever the panel should refetch (query, filters, time range, or a
  // manual refresh), so re-derive a fresh timestamp each time to trigger the aiops component's fetch.
  const patternAnalysisComponentProps: LogCategorizationEmbeddableProps = useMemo(
    () => ({
      input: {
        dataView,
        savedSearch: { searchSource: savedSearch.searchSource },
        lastReloadRequestTime: Date.now(),
      },
      renderViewModeToggle: () => <></>,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataView, savedSearch, fetchContext]
  );

  if (!aiopsService) {
    return null;
  }

  return (
    <div data-test-subj="dscPatternAnalysisEmbeddedContent">
      <aiopsService.PatternAnalysisComponent
        props={patternAnalysisComponentProps}
        appContextValue={
          { embeddingOrigin: 'dashboard', ...services } as unknown as AiopsAppContextValue
        }
      />
    </div>
  );
}
