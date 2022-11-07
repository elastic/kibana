/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useReducer, useCallback, useState, useMemo } from 'react';
import { EuiDragDropContext, DragDropContextProps, useEuiPaddingSize } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type Filter, BooleanRelation } from '@kbn/es-query';
import { css } from '@emotion/css';
import { isEqual } from 'lodash';
import { FiltersBuilderContextType } from './filters_builder_context';
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

const rootLevelConditionType = BooleanRelation.AND;
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
  const mPaddingSize = useEuiPaddingSize('m');

  const filtersBuilderStyles = useMemo(
    () => css`
      .filter-builder__panel {
        &.filter-builder__panel-nested {
          padding: ${mPaddingSize} 0;
        }
      }

      .filter-builder__item {
        &.filter-builder__item-nested {
          padding: 0 ${mPaddingSize};
        }
      }
    `,
    [mPaddingSize]
  );

  useEffect(() => {
    if (!isEqual(state.filters, filters)) {
      onChange(state.filters);
    }
  }, [filters, onChange, state.filters]);

  const handleMoveFilter = useCallback(
    (pathFrom: string, pathTo: string, booleanRelation: BooleanRelation) => {
      if (pathFrom === pathTo) {
        return null;
      }

      dispatch({
        type: 'moveFilter',
        payload: {
          pathFrom,
          pathTo,
          booleanRelation,
          dataView,
        },
      });
    },
    [dataView]
  );

  const onDragEnd: DragDropContextProps['onDragEnd'] = ({ combine, source, destination }) => {
    if (source && destination) {
      handleMoveFilter(source.droppableId, destination.droppableId, BooleanRelation.AND);
    }

    if (source && combine) {
      handleMoveFilter(source.droppableId, combine.droppableId, BooleanRelation.OR);
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
    <div className={filtersBuilderStyles}>
      <FiltersBuilderContextType.Provider
        value={{
          globalParams: { hideOr, maxDepth },
          dataView,
          dispatch,
          dropTarget,
          timeRangeForSuggestionsOverride,
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
