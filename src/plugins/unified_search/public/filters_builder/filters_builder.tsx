/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

export interface FiltersBuilderProps {
  filters: Filter[];
  dataView: DataView;
  onChange: (filters: Filter[]) => void;
  timeRangeForSuggestionsOverride?: boolean;
  maxDepth?: number;
  hideOr?: boolean;
  disabled?: boolean;
}

const rootLevelConditionType = BooleanRelation.AND;
const DEFAULT_MAX_DEPTH = 10;

function FiltersBuilder({
  onChange,
  dataView,
  filters,
  timeRangeForSuggestionsOverride,
  maxDepth = DEFAULT_MAX_DEPTH,
  hideOr = false,
  disabled = false,
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
          disabled,
        }}
      >
        <EuiDragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragActive}>
          <FilterGroup filters={state.filters} booleanRelation={rootLevelConditionType} path={''} />
        </EuiDragDropContext>
      </FiltersBuilderContextType.Provider>
    </div>
  );
}

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default FiltersBuilder;
