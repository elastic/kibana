/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIcon } from '@elastic/eui';
import { FieldFilter, Filter, getFilterParams } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { ConditionTypes } from '../filters_editor_condition_types';
import { FiltersEditorContextType } from '../filters_editor_context';
import { FieldInput } from './filters_editor_filter_item_field_input';
import { OperatorInput } from './filters_editor_filter_item_operator_input';
import { ParamsEditor } from './filters_editor_filter_item_params_editor';
import { FilterGroup } from '../filters_editor_filter_group';
import { getConditionalOperationType } from '../filters_editor_utils';
import type { Path } from '../filter_editors_types';
import {
  getFieldFromFilter,
  getOperatorFromFilter,
} from '../../../filter_bar/filter_editor/lib/filter_editor_utils';
import { Operator } from '../../../filter_bar/filter_editor/lib/filter_operators';

export interface FilterItemProps {
  path: Path;
  filter: Filter;
  timeRangeForSuggestionsOverride: boolean;
  reverseBackground?: boolean;
  disableOr: boolean;
  disableAnd: boolean;
  disableRemove: boolean;
  // todo: check for correct type
  dragHandleProps: unknown;
}

export function FilterItem({
  filter,
  path,
  timeRangeForSuggestionsOverride,
  reverseBackground,
  disableOr,
  disableAnd,
  disableRemove,
  dragHandleProps,
}: FilterItemProps) {
  const { dispatch, dataView } = useContext(FiltersEditorContextType);
  const conditionalOperationType = getConditionalOperationType(filter);
  const field: DataViewField | undefined = getFieldFromFilter(filter as FieldFilter, dataView);
  const operator: Operator | undefined = getOperatorFromFilter(filter);
  const params: Filter['meta']['params'] = getFilterParams(filter);

  const onHandleField = (field: DataViewField) => {
    dispatch({
      type: 'updateFilter',
      payload: { dataView, field, operator, params, path, filter },
    });
  };

  const onHandleOperator = (operator: Operator, params: Filter['meta']['params']) => {
    dispatch({
      type: 'updateFilter',
      payload: { dataView, field, operator, params, path, filter },
    });
  };

  const onHandleParamsChange = (params: Filter['meta']['params']) => {
    dispatch({
      type: 'updateFilter',
      payload: { dataView, field, operator, params, path, filter },
    });
  };

  const onHandleParamsUpdate = (params: Filter['meta']['params']) => {
    dispatch({
      type: 'updateFilter',
      payload: { dataView, field, operator, params, path, filter },
    });
  };

  const onRemoveFilter = useCallback(() => {
    dispatch({
      type: 'removeFilter',
      payload: {
        path,
      },
    });
  }, [dispatch, path]);

  const onAddFilter = useCallback(
    (conditionalType: ConditionTypes) => {
      dispatch({
        type: 'addFilter',
        payload: {
          path,
          dataViewId: dataView.id,
          conditionalType,
        },
      });
    },
    [dispatch, dataView.id, path]
  );

  const onAddButtonClick = useCallback(() => onAddFilter(ConditionTypes.AND), [onAddFilter]);
  const onOrButtonClick = useCallback(() => onAddFilter(ConditionTypes.OR), [onAddFilter]);

  if (!dataView) {
    return null;
  }

  return (
    <EuiFlexItem>
      {conditionalOperationType ? (
        <FilterGroup
          path={path}
          conditionType={conditionalOperationType}
          filters={filter.meta?.params?.filters}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          reverseBackground={!reverseBackground}
        />
      ) : (
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          <EuiFlexItem grow={false} {...dragHandleProps}>
            <EuiIcon type="grab" size="s" />
          </EuiFlexItem>

          <EuiFlexItem grow={3}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiFormRow fullWidth>
                  <FieldInput field={field} dataView={dataView} onHandleField={onHandleField} />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow fullWidth>
                  <OperatorInput
                    field={field}
                    operator={operator}
                    params={params}
                    onHandleOperator={onHandleOperator}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <ParamsEditor
                  dataView={dataView}
                  field={field}
                  operator={operator}
                  params={params}
                  onHandleParamsChange={onHandleParamsChange}
                  onHandleParamsUpdate={onHandleParamsUpdate}
                  timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  onClick={onOrButtonClick}
                  isDisabled={disableOr}
                  iconType="returnKey"
                  size="s"
                  aria-label="Add filter group with OR"
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  onClick={onAddButtonClick}
                  isDisabled={disableAnd}
                  iconType="plus"
                  size="s"
                  aria-label="Add filter group with AND"
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  onClick={onRemoveFilter}
                  iconType="trash"
                  isDisabled={disableRemove}
                  size="s"
                  color="danger"
                  aria-label="Delete filter group"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  );
}
