/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { FieldIcon } from '@kbn/react-field';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import {
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { getFilterableFields } from '../../filter_bar/filter_editor';

interface FieldInputProps {
  dataView: DataView;
  onHandleField: (field: DataViewField) => void;
  field?: DataViewField;
}

export function FieldInput({ field, dataView, onHandleField }: FieldInputProps) {
  const fields = dataView ? getFilterableFields(dataView) : [];
  const id = useGeneratedHtmlId({ prefix: 'fieldInput' });

  const onFieldChange = useCallback(
    ([selectedField]: DataViewField[]) => {
      onHandleField(selectedField);
    },
    [onHandleField]
  );

  const getLabel = useCallback(
    (dataViewField: DataViewField) => ({
      label: dataViewField.customLabel || dataViewField.name,
      value: dataViewField.type as KBN_FIELD_TYPES,
    }),
    []
  );

  const optionFields = fields.map(getLabel);
  const euiOptions: Array<EuiComboBoxOptionOption<KBN_FIELD_TYPES>> = optionFields;
  const selectedEuiOptions = (field ? [field] : [])
    .filter((option) => fields.indexOf(option) !== -1)
    .map((option) => euiOptions[fields.indexOf(option)]);

  const onComboBoxChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(
      ({ label }) => fields[optionFields.findIndex((optionField) => optionField.label === label)]
    );
    onFieldChange(newValues);
  };

  return (
    <EuiComboBox
      id={id}
      options={euiOptions}
      selectedOptions={selectedEuiOptions}
      onChange={onComboBoxChange}
      isDisabled={!dataView}
      placeholder={i18n.translate('unifiedSearch.filter.filtersBuilder.fieldSelectPlaceholder', {
        defaultMessage: 'Select a field',
      })}
      sortMatchesBy="startsWith"
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      compressed
      fullWidth
      data-test-subj="filterFieldSuggestionList"
      renderOption={(option) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={null}>
            <FieldIcon type={option.value!} fill="none" />
          </EuiFlexItem>
          <EuiFlexItem>{option.label}</EuiFlexItem>
        </EuiFlexGroup>
      )}
    />
  );
}
