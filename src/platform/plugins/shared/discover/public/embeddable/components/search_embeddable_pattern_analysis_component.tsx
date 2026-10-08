/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';
import { filter, skip } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { isOfQueryType } from '@kbn/es-query';
import type { FetchContext } from '@kbn/presentation-publishing';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { AiopsAppContextValue } from '@kbn/aiops-plugin/public/hooks/use_aiops_app_context';
import type { LogCategorizationEmbeddableProps } from '@kbn/aiops-plugin/public/components/log_categorization/log_categorization_for_embeddable/log_categorization_for_discover';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { SearchEmbeddableApi } from '../types';
import { getTimeRangeFromFetchContext } from '../utils/update_search_source';

interface SavedSearchEmbeddablePatternAnalysisComponentProps {
  api: SearchEmbeddableApi & {
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
  };
  dataView: DataView;
}

const EMPTY_QUERY = { query: '', language: 'kuery' };

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
  const [lastReloadRequestTime, setLastReloadRequestTime] = useState<number | undefined>();

  // The aiops component fetches on mount (once the first fetch context is available), so only
  // request a reload for subsequent fetch contexts (query, filters, time range, or a manual refresh).
  useEffect(() => {
    const subscription = api.fetchContext$
      .pipe(filter(Boolean), skip(1))
      .subscribe(() => setLastReloadRequestTime(Date.now()));
    return () => subscription.unsubscribe();
  }, [api.fetchContext$]);

  // `updateSearchSource` (see `initialize_fetch.ts`) sets the panel's query, filters and time range
  // on the parent of `savedSearch.searchSource`. Passing the query makes aiops use that combined
  // search source instead of syncing the saved search's filters into the global filter manager.
  const patternAnalysisComponentProps: LogCategorizationEmbeddableProps | undefined =
    useMemo(() => {
      if (!fetchContext) {
        return;
      }
      const timeRange = getTimeRangeFromFetchContext(fetchContext);
      return {
        input: {
          dataView,
          savedSearch: { searchSource: savedSearch.searchSource },
          query: isOfQueryType(fetchContext.query) ? fetchContext.query : EMPTY_QUERY,
          // Resolve relative ranges (e.g. `now-15m`) per fetch so a refresh moves the window.
          timeRange: timeRange ? getAbsoluteTimeRange(timeRange) : undefined,
          lastReloadRequestTime,
        },
        renderViewModeToggle: () => <></>,
      };
    }, [dataView, savedSearch, fetchContext, lastReloadRequestTime]);

  if (!aiopsService || !patternAnalysisComponentProps) {
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
