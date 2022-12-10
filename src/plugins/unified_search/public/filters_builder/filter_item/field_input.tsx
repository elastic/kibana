/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
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
import { FiltersBuilderContextType } from '../context';
import { TruncatedLabel } from '../../filter_bar/filter_editor';

const DEFAULT_COMBOBOX_WIDTH = 205;
const COMBOBOX_PADDINGS = 100;
const DEFAULT_FONT = '14px Inter';

export const strings = {
  getFieldSelectPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.fieldSelectPlaceholder', {
      defaultMessage: 'Select a field',
    }),
};

interface FieldInputProps {
  dataView: DataView;
  onHandleField: (field: DataViewField) => void;
  field?: DataViewField;
}

export function FieldInput({ field, dataView, onHandleField }: FieldInputProps) {
  const { disabled } = useContext(FiltersBuilderContextType);
  const fields = dataView ? getFilterableFields(dataView) : [];
  const id = useGeneratedHtmlId({ prefix: 'fieldInput' });
  const comboBoxRef = useRef<HTMLInputElement>(null);

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
    <div ref={comboBoxRef}>
      <EuiComboBox
        id={id}
        options={euiOptions}
        selectedOptions={selectedEuiOptions}
        onChange={onComboBoxChange}
        isDisabled={disabled}
        placeholder={strings.getFieldSelectPlaceholderLabel()}
        sortMatchesBy="startsWith"
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        compressed
        fullWidth
        data-test-subj="filterFieldSuggestionList"
        renderOption={(option, searchValue) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={null}>
              <FieldIcon type={option.value!} fill="none" />
            </EuiFlexItem>
            <EuiFlexItem>
              <TruncatedLabel
                defaultComboboxWidth={DEFAULT_COMBOBOX_WIDTH}
                defaultFont={DEFAULT_FONT}
                comboboxPaddings={COMBOBOX_PADDINGS}
                comboBoxRef={comboBoxRef}
                label={option.label}
                search={searchValue}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      />
    </div>
  );
}
