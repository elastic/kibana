/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiButtonIcon } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { FiltersEditorContextType } from '../filters_editor_context';
import { FieldInput } from './filters_editor_filter_item_field_input';
import { OperatorInput } from './filters_editor_filter_item_operator_input';
import { ParamsEditor } from './filters_editor_filter_item_params_editor';
import { FilterGroup } from '../filters_editor_filter_group';
import { getConditionalOperationType } from '../filters_editor_utils';
import type { Path } from '../filter_editors_types';
import { getOperatorFromFilter } from '../../../filter_bar/filter_editor/lib/filter_editor_utils';
import { Operator } from '../../../filter_bar/filter_editor/lib/filter_operators';

export interface FilterItemProps {
  path: Path;
  filter: Filter;
  timeRangeForSuggestionsOverride: boolean;
  reverseBackground?: boolean;
}

export function FilterItem({
  filter,
  path,
  timeRangeForSuggestionsOverride = false,
  reverseBackground,
}: FilterItemProps) {
  const conditionalOperationType = getConditionalOperationType(filter);
  const { dispatch, dataView } = useContext(FiltersEditorContextType);

  const [selectedField, setSelectedField] = useState<DataViewField | undefined>(undefined);
  const [selectedOperator, setSelectedOperator] = useState<Operator | undefined>(
    getSelectedOperator()
  );
  const [selectedParams, setSelectedParams] = useState<any>(undefined);

  function getSelectedOperator() {
    return getOperatorFromFilter(filter);
  }

  const onHandleField = (field: DataViewField) => {
    setSelectedField(field);
    setSelectedOperator(undefined);
    setSelectedParams(undefined);
  };

  const onHandleOperator = (operator: Operator, params: any) => {
    setSelectedOperator(operator);
    setSelectedParams(params);
  };

  const onHandleParamsChange = (params: any) => {
    setSelectedParams(params);
  };

  const onHandleParamsUpdate = (value: string) => {
    setSelectedParams((prevState: any) => ({ params: [value, ...(prevState.params || [])] }));
  };

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
          <EuiFlexItem grow={false}>
            <EuiIcon type="grab" size="s" />
          </EuiFlexItem>

          <EuiFlexItem grow={3}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <FieldInput
                  field={selectedField}
                  dataView={dataView}
                  onHandleField={onHandleField}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <OperatorInput
                  field={selectedField}
                  operator={selectedOperator}
                  params={selectedParams}
                  onHandleOperator={onHandleOperator}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ParamsEditor
                  dataView={dataView}
                  field={selectedField}
                  operator={selectedOperator}
                  params={selectedParams}
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
                  onClick={() => {
                    dispatch({
                      type: 'addFilterGroupWithFilter',
                      payload: { path, dataViewId: dataView.id },
                    });
                  }}
                  iconType="returnKey"
                  size="s"
                  aria-label="Add filter group with OR"
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  onClick={() => {
                    dispatch({ type: 'addFilter', payload: { path, dataViewId: dataView.id } });
                  }}
                  iconType="plus"
                  size="s"
                  aria-label="Add filter group with AND"
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  onClick={() => {
                    dispatch({ type: 'removeFilter', payload: { path } });
                  }}
                  iconType="trash"
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
