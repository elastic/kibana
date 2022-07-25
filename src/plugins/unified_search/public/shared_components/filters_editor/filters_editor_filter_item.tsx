/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiButtonIcon, EuiFormRow } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { FiltersEditorContextType } from './filters_editor_context';
import { FilterGroup } from './filters_editor_filter_group';
import { getConditionalOperationType } from './filters_editor_utils';
import type { Path } from './filter_editors_types';
import { PhraseValueInput } from '../../filter_bar/filter_editor/phrase_value_input';
import { PhrasesValuesInput } from '../../filter_bar/filter_editor/phrases_values_input';
import { RangeValueInput } from '../../filter_bar/filter_editor/range_value_input';
import {
  getFilterableFields,
  getOperatorFromFilter,
  getOperatorOptions,
} from '../../filter_bar/filter_editor/lib/filter_editor_utils';
import {
  GenericComboBox,
  GenericComboBoxProps,
} from '../../filter_bar/filter_editor/generic_combo_box';
import { Operator } from '../../filter_bar/filter_editor/lib/filter_operators';

export interface FilterItemProps {
  path: Path;
  filter: Filter;
  timeRangeForSuggestionsOverride: boolean;
}

export function FilterItem({
  filter,
  path,
  timeRangeForSuggestionsOverride = false,
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

  function renderFieldInput() {
    const fields = dataView ? getFilterableFields(dataView) : [];

    function onFieldChange([field]: DataViewField[]) {
      const operator = undefined;
      const params = undefined;
      setSelectedField(field);
      setSelectedOperator(operator);
      setSelectedParams(params);
    }

    return (
      <EuiFormRow fullWidth>
        <FieldComboBox
          fullWidth
          compressed
          id="fieldInput"
          isDisabled={!dataView}
          placeholder={i18n.translate('unifiedSearch.filter.filterEditor.fieldSelectPlaceholder', {
            defaultMessage: 'Select a field first',
          })}
          options={fields}
          selectedOptions={selectedField ? [selectedField] : []}
          getLabel={(field) => field.customLabel || field.name}
          onChange={onFieldChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  function renderOperatorInput() {
    const operators = selectedField ? getOperatorOptions(selectedField) : [];

    function onOperatorChange([operator]: Operator[]) {
      const params = get(operator, 'type') === get(operator, 'type') ? selectedParams : undefined;

      setSelectedOperator(operator);
      setSelectedParams(params);
    }

    return (
      <EuiFormRow fullWidth>
        <OperatorComboBox
          fullWidth
          compressed
          isDisabled={!selectedField}
          placeholder={
            selectedField
              ? i18n.translate(
                  'unifiedSearch.filter.filterEditor.operatorSelectPlaceholderSelect',
                  {
                    defaultMessage: 'Select',
                  }
                )
              : i18n.translate(
                  'unifiedSearch.filter.filterEditor.operatorSelectPlaceholderWaiting',
                  {
                    defaultMessage: 'Waiting',
                  }
                )
          }
          options={operators}
          selectedOptions={selectedOperator ? [selectedOperator] : []}
          getLabel={({ message }) => message}
          onChange={onOperatorChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  function renderParamsEditor() {
    if (!dataView) {
      return '';
    }

    function onParamsChange(params: any) {
      setSelectedParams(params);
    }

    function onParamsUpdate(value: string) {
      setSelectedParams((prevState: any) => ({ params: [value, ...(prevState.params || [])] }));
    }

    switch (selectedOperator?.type) {
      case 'exists':
        return '';
      case 'phrase':
        return (
          <PhraseValueInput
            compressed
            indexPattern={dataView}
            field={selectedField!}
            value={selectedParams}
            onChange={onParamsChange}
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            fullWidth
          />
        );
      case 'phrases':
        return (
          <PhrasesValuesInput
            compressed
            indexPattern={dataView}
            field={selectedField!}
            values={selectedParams}
            onChange={onParamsChange}
            onParamsUpdate={onParamsUpdate}
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            fullWidth
          />
        );
      case 'range':
        return (
          <RangeValueInput
            compressed
            field={selectedField!}
            value={selectedParams}
            onChange={onParamsChange}
            fullWidth
          />
        );
      default:
        return (
          <PhraseValueInput
            disabled={!dataView || !selectedOperator}
            indexPattern={dataView}
            field={selectedField!}
            value={selectedParams}
            onChange={onParamsChange}
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            fullWidth
            compressed
          />
        );
    }
  }

  function FieldComboBox(props: GenericComboBoxProps<DataViewField>) {
    return GenericComboBox(props);
  }

  function OperatorComboBox(props: GenericComboBoxProps<Operator>) {
    return GenericComboBox(props);
  }

  return (
    <EuiFlexItem>
      {conditionalOperationType ? (
        <FilterGroup
          path={path}
          conditionType={conditionalOperationType}
          filters={filter.meta?.params?.filters}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
        />
      ) : (
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="grab" size="s" />
          </EuiFlexItem>

          <EuiFlexItem grow={3}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>{renderFieldInput()}</EuiFlexItem>
              <EuiFlexItem>{renderOperatorInput()}</EuiFlexItem>
              <EuiFlexItem>{renderParamsEditor()}</EuiFlexItem>
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
