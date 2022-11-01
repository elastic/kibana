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

  const getTypeForFieldIcon = (filterableField: DataViewField) =>
    filterableField.type === 'string' && filterableField.esTypes
      ? filterableField.esTypes[0]
      : filterableField.type;

  const getLabel = useCallback((view: DataViewField) => {
    return {
      label: view.customLabel || view.name,
      value: getTypeForFieldIcon(view),
    };
  }, []);

  const optionFields = fields.map(getLabel);
  const euiOptions: EuiComboBoxOptionOption[] = optionFields;
  const selectedEuiOptions = (field ? [field] : [])
    .filter((option) => {
      return fields.indexOf(option) !== -1;
    })
    .map((option) => {
      return euiOptions[fields.indexOf(option)];
    });

  const onComboBoxChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => {
      return fields[optionFields.findIndex((optionField) => optionField.label === label)];
    });
    onFieldChange(newValues);
  };

  return (
    <>
      <EuiComboBox
        options={euiOptions}
        selectedOptions={selectedEuiOptions}
        onChange={onComboBoxChange}
        id={id}
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
        renderOption={(option: EuiComboBoxOptionOption) => {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={null}>
                <FieldIcon type={option.value as string} fill="none" />
              </EuiFlexItem>
              <EuiFlexItem>{option.label}</EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      />
    </>
  );
}
