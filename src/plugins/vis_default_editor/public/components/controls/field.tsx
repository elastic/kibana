/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import React, { useState, useCallback } from 'react';
import { useMount } from 'react-use';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggParam, IAggConfig, IFieldParamType, IndexPatternField } from 'src/plugins/data/public';
import { formatListAsProse, parseCommaSeparatedList, useValidation } from './utils';
import { AggParamEditorProps } from '../agg_param_props';
import { ComboBoxGroupedOptions } from '../../utils';

const label = i18n.translate('visDefaultEditor.controls.field.fieldLabel', {
  defaultMessage: 'Field',
});

export interface FieldParamEditorProps extends AggParamEditorProps<IndexPatternField> {
  customError?: string;
  customLabel?: string;
}

function FieldParamEditor({
  agg,
  aggParam,
  customError,
  customLabel,
  indexedFields = [],
  showValidation,
  value,
  setTouched,
  setValidity,
  setValue,
}: FieldParamEditorProps) {
  const [isDirty, setIsDirty] = useState(false);
  const selectedOptions: ComboBoxGroupedOptions<IndexPatternField> = value
    ? [{ label: value.displayName || value.name, target: value }]
    : [];

  const onChange = (options: EuiComboBoxOptionOption[]) => {
    const selectedOption: IndexPatternField = get(options, '0.target');
    if (!(aggParam.required && !selectedOption)) {
      setValue(selectedOption);
    }

    if (aggParam.onChange) {
      aggParam.onChange(agg);
    }
  };
  const errors = customError ? [customError] : [];

  if (!indexedFields.length) {
    errors.push(
      i18n.translate('visDefaultEditor.controls.field.noCompatibleFieldsDescription', {
        defaultMessage:
          'The index pattern {indexPatternTitle} does not contain any of the following compatible field types: {fieldTypes}',
        values: {
          indexPatternTitle: agg.getIndexPattern && agg.getIndexPattern().title,
          fieldTypes: getFieldTypesString(agg),
        },
      })
    );
  }

  const isValid = !!value && !errors.length && !isDirty;
  // we show an error message right away if there is no compatible fields
  const showErrorMessage = (showValidation || !indexedFields.length) && !isValid;

  useValidation(setValidity, isValid);
  useMount(() => {
    // set field if only one available
    if (indexedFields.length !== 1) {
      return;
    }

    const indexedField = indexedFields[0];

    if (!('options' in indexedField)) {
      setValue(indexedField.target);
    } else if (indexedField.options.length === 1) {
      setValue(indexedField.options[0].target);
    }
  });

  const onSearchChange = useCallback((searchValue) => setIsDirty(Boolean(searchValue)), []);

  return (
    <EuiFormRow
      label={customLabel || label}
      isInvalid={showErrorMessage}
      fullWidth={true}
      error={errors}
      compressed
    >
      <EuiComboBox
        compressed
        placeholder={i18n.translate('visDefaultEditor.controls.field.selectFieldPlaceholder', {
          defaultMessage: 'Select a field',
        })}
        options={indexedFields}
        isDisabled={!indexedFields.length}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        isInvalid={showErrorMessage}
        onChange={onChange}
        onBlur={setTouched}
        onSearchChange={onSearchChange}
        sortMatchesBy="startsWith"
        data-test-subj="visDefaultEditorField"
        fullWidth={true}
      />
    </EuiFormRow>
  );
}

function getFieldTypesString(agg: IAggConfig) {
  const param =
    get(agg, 'type.params', []).find((p: AggParam) => p.name === 'field') ||
    ({} as IFieldParamType);
  return formatListAsProse(parseCommaSeparatedList(param.filterFieldTypes), { inclusive: false });
}

export { FieldParamEditor };
