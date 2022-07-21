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
}

const rootLevelConditionType = ConditionTypes.AND;

export function FiltersEditor({ onChange, dataView, filters }: FiltersEditorProps) {
  const [state, dispatch] = useReducer(filtersEditorReducer, { filters });

  useEffect(() => {
    if (state.filters !== filters) {
      onChange(state.filters);
    }
  }, [filters, onChange, state.filters]);

  return (
    <FiltersEditorContextType.Provider value={{ dataView, dispatch }}>
      <FilterGroup filters={state.filters} conditionType={rootLevelConditionType} path={''} />
    </FiltersEditorContextType.Provider>
  );
}
