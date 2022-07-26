/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useReducer } from 'react';

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { FiltersEditorContextType } from './filters_editor_context';
import { ConditionTypes } from './filters_editor_condition_types';
import { FilterGroup } from './filters_editor_filter_group';
import { filtersEditorReducer } from './filters_editor_reducer';

export interface FiltersEditorProps {
  filters: Filter[];
  dataView: DataView;
  onChange: (filters: Filter[]) => void;
  timeRangeForSuggestionsOverride: boolean;
  maxDepth?: number;
  disableOr?: boolean;
  disableAnd?: boolean;
}

const rootLevelConditionType = ConditionTypes.AND;
const DEFAULT_MAX_DEPTH = 10;

export function FiltersEditor({
  onChange,
  dataView,
  filters,
  timeRangeForSuggestionsOverride,
  maxDepth = DEFAULT_MAX_DEPTH,
  disableOr = false,
  disableAnd = false,
}: FiltersEditorProps) {
  const [state, dispatch] = useReducer(filtersEditorReducer, { filters });

  useEffect(() => {
    if (state.filters !== filters) {
      onChange(state.filters);
    }
  }, [filters, onChange, state.filters]);

  return (
    <FiltersEditorContextType.Provider
      value={{
        globalParams: { disableOr, disableAnd, maxDepth },
        dataView,
        dispatch,
      }}
    >
      <FilterGroup
        filters={state.filters}
        conditionType={rootLevelConditionType}
        path={''}
        timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
      />
    </FiltersEditorContextType.Provider>
  );
}
