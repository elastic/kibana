/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Filter, buildEmptyFilter } from '@kbn/es-query';
import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { IUnifiedSearchPluginServices } from '../types';
import { FILTER_EDITOR_WIDTH } from '../filter_bar/filter_item/filter_item';
import { FilterEditor } from '../filter_bar/filter_editor';
import { fetchIndexPatterns } from './fetch_index_patterns';
import { SuggestionsAbstraction } from '../typeahead/suggestions_component';

interface QueryDslFilter {
  queryDsl: string;
  customLabel: string | null;
}

interface FilterEditorWrapperProps {
  indexPatterns?: Array<DataView | string>;
  filters: Filter[];
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  closePopoverOnAdd?: () => void;
  closePopoverOnCancel?: () => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
  onLocalFilterUpdate?: (filter: Filter | QueryDslFilter) => void;
  onLocalFilterCreate?: (initialState: { filter: Filter; queryDslFilter: QueryDslFilter }) => void;
  suggestionsAbstraction?: SuggestionsAbstraction;
}

export const FilterEditorWrapper = React.memo(function FilterEditorWrapper({
  indexPatterns,
  filters,
  timeRangeForSuggestionsOverride,
  filtersForSuggestions,
  closePopoverOnAdd,
  closePopoverOnCancel,
  onFiltersUpdated,
  onLocalFilterUpdate,
  onLocalFilterCreate,
  suggestionsAbstraction,
}: FilterEditorWrapperProps) {
  const fetchIndexAbortController = useRef<AbortController>();

  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { uiSettings, data, usageCollection, appName, docLinks } = kibana.services;
  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);
  const [dataViews, setDataviews] = useState<DataView[]>([]);
  const [newFilter, setNewFilter] = useState<Filter | undefined>(undefined);
  const isPinned = uiSettings!.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT);

  useEffect(() => {
    fetchIndexAbortController.current = new AbortController();

    return () => {
      fetchIndexAbortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    const fetchDataViews = async () => {
      const stringPatterns = indexPatterns?.filter(
        (indexPattern) => typeof indexPattern === 'string'
      ) as string[];
      const objectPatterns = indexPatterns?.filter(
        (indexPattern) => typeof indexPattern !== 'string'
      ) as DataView[];

      fetchIndexAbortController.current?.abort();
      fetchIndexAbortController.current = new AbortController();
      const currentFetchIndexAbortController = fetchIndexAbortController.current;

      const objectPatternsFromStrings = (await fetchIndexPatterns(
        data.dataViews,
        stringPatterns.map((value) => ({ type: 'title', value }))
      )) as DataView[];

      if (!currentFetchIndexAbortController.signal.aborted) {
        setDataviews([...objectPatterns, ...objectPatternsFromStrings]);
        const [dataView] = [...objectPatterns, ...objectPatternsFromStrings];
        const index = dataView && dataView.id;
        const emptyFilter = buildEmptyFilter(isPinned, index);
        setNewFilter(emptyFilter);
      }
    };
    if (indexPatterns) {
      fetchDataViews();
    }
  }, [data.dataViews, indexPatterns, onLocalFilterCreate, onLocalFilterUpdate, isPinned]);

  function onAdd(filter: Filter) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:added`);
    closePopoverOnAdd?.();
    const updatedFilters = [...filters, filter];
    onFiltersUpdated?.(updatedFilters);
  }

  return (
    <div style={{ width: FILTER_EDITOR_WIDTH, maxWidth: '100%' }}>
      {newFilter && (
        <FilterEditor
          mode="add"
          filter={newFilter}
          indexPatterns={dataViews}
          key={JSON.stringify(newFilter)}
          onSubmit={onAdd}
          onCancel={() => closePopoverOnCancel?.()}
          onLocalFilterUpdate={onLocalFilterUpdate}
          onLocalFilterCreate={onLocalFilterCreate}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          filtersForSuggestions={filtersForSuggestions}
          suggestionsAbstraction={suggestionsAbstraction}
          docLinks={docLinks}
          dataViews={data.dataViews}
        />
      )}
    </div>
  );
});
