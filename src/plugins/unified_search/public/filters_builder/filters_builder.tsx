/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { EuiDragDropContext, DragDropContextProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { FiltersBuilderContextType } from './filters_builder_context';
import { ConditionTypes } from './filters_builder_condition_types';
import { FilterGroup } from './filters_builder_filter_group';
import { FiltersBuilderReducer } from './filters_builder_reducer';

export interface FiltersBuilderProps {
  filters: Filter[];
  dataView: DataView;
  onChange: (filters: Filter[]) => void;
  timeRangeForSuggestionsOverride?: boolean;
  maxDepth?: number;
  hideOr?: boolean;
}

const rootLevelConditionType = ConditionTypes.AND;
const DEFAULT_MAX_DEPTH = 10;

function FiltersBuilder({
  onChange,
  dataView,
  filters,
  timeRangeForSuggestionsOverride,
  maxDepth = DEFAULT_MAX_DEPTH,
  hideOr = false,
}: FiltersBuilderProps) {
  const [state, dispatch] = useReducer(FiltersBuilderReducer, { filters });
  const [dropTarget, setDropTarget] = useState('');

  useEffect(() => {
    if (state.filters !== filters) {
      onChange(state.filters);
    }
  }, [filters, onChange, state.filters]);

  const handleMoveFilter = useCallback(
    (pathFrom: string, pathTo: string, conditionalType: ConditionTypes) => {
      if (pathFrom === pathTo) {
        return null;
      }

      dispatch({
        type: 'moveFilter',
        payload: {
          pathFrom,
          pathTo,
          conditionalType,
        },
      });
    },
    []
  );

  const onDragEnd: DragDropContextProps['onDragEnd'] = ({ combine, source, destination }) => {
    if (source && destination) {
      handleMoveFilter(source.droppableId, destination.droppableId, ConditionTypes.AND);
    }

    if (source && combine) {
      handleMoveFilter(source.droppableId, combine.droppableId, ConditionTypes.OR);
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
    <FiltersBuilderContextType.Provider
      value={{
        globalParams: { hideOr, maxDepth },
        dataView,
        dispatch,
        dropTarget,
      }}
    >
      <EuiDragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragActive}>
        <FilterGroup
          filters={state.filters}
          conditionType={rootLevelConditionType}
          path={''}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
        />
      </EuiDragDropContext>
    </FiltersBuilderContextType.Provider>
  );
}

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default FiltersBuilder;
