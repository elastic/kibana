/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useReducer, useCallback, useState, useRef } from 'react';
import { EuiDragDropContext, DragDropContextProps, useEuiPaddingSize } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type Filter, BooleanRelation, compareFilters } from '@kbn/es-query';
import { FiltersBuilderContextType } from './context';
import { FilterGroup } from './filter_group';
import { FiltersBuilderReducer } from './reducer';
import { getPathInArray } from './utils';
import { FilterLocation } from './types';
import { filtersBuilderCss } from './filters_builder.styles';
import { SuggestionsAbstraction } from '../typeahead/suggestions_component';

export interface FiltersBuilderProps {
  filters: Filter[];
  dataView: DataView;
  onChange: (filters: Filter[]) => void;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  maxDepth?: number;
  hideOr?: boolean;
  disabled?: boolean;
  suggestionsAbstraction?: SuggestionsAbstraction;
  filtersCount?: number;
}

const rootLevelConditionType = BooleanRelation.AND;
const DEFAULT_MAX_DEPTH = 10;

function FiltersBuilder({
  onChange,
  dataView,
  filters,
  timeRangeForSuggestionsOverride,
  filtersForSuggestions,
  maxDepth = DEFAULT_MAX_DEPTH,
  hideOr = false,
  disabled = false,
  suggestionsAbstraction,
  filtersCount,
}: FiltersBuilderProps) {
  const filtersRef = useRef(filters);
  const [state, dispatch] = useReducer(FiltersBuilderReducer, { filters });
  const [dropTarget, setDropTarget] = useState('');
  const sPaddingSize = useEuiPaddingSize('s');
  useEffect(() => {
    if (
      !compareFilters(filters, filtersRef.current, {
        index: true,
        state: true,
        negate: true,
        disabled: true,
        alias: true,
      })
    ) {
      filtersRef.current = filters;
      dispatch({ type: 'updateFilters', payload: { filters } });
    }
  }, [filters]);

  useEffect(() => {
    if (state.filters !== filtersRef.current) {
      filtersRef.current = state.filters;
      onChange(state.filters);
    }
  }, [onChange, state.filters]);

  const handleMoveFilter = useCallback(
    (from: FilterLocation, to: FilterLocation, booleanRelation: BooleanRelation) => {
      if (from.path === to.path) {
        return null;
      }

      dispatch({
        type: 'moveFilter',
        payload: {
          from,
          to,
          booleanRelation,
          dataView,
        },
      });
    },
    [dataView]
  );

  const onDragEnd: DragDropContextProps['onDragEnd'] = (args) => {
    const { combine, source, destination } = args;
    if (source && destination) {
      handleMoveFilter(
        { path: source.droppableId, index: source.index },
        { path: destination.droppableId, index: destination.index },
        BooleanRelation.AND
      );
    }

    if (source && combine) {
      const path = getPathInArray(combine.droppableId);
      handleMoveFilter(
        { path: source.droppableId, index: source.index },
        { path: combine.droppableId, index: path.at(-1) ?? 0 },
        BooleanRelation.OR
      );
    }
    setDropTarget('');
  };

  const onDragActive: DragDropContextProps['onDragUpdate'] = ({ destination, combine }) => {
    if (destination) {
      setDropTarget(destination.droppableId);
    }

    if (combine) {
      setDropTarget(combine.droppableId);
    }
  };

  return (
    <div className={filtersBuilderCss(sPaddingSize)}>
      <FiltersBuilderContextType.Provider
        value={{
          globalParams: { hideOr, maxDepth },
          dataView,
          dispatch,
          dropTarget,
          timeRangeForSuggestionsOverride,
          filtersForSuggestions,
          disabled,
          suggestionsAbstraction,
        }}
      >
        <EuiDragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragActive}>
          <FilterGroup
            filters={state.filters}
            booleanRelation={rootLevelConditionType}
            path={''}
            filtersCount={filtersCount}
          />
        </EuiDragDropContext>
      </FiltersBuilderContextType.Provider>
    </div>
  );
}

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default FiltersBuilder;
