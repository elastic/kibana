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
import React, { useEffect } from 'react';

import { EuiComboBox, EuiComboBoxOptionProps, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggConfig } from '../../..';
import { Field } from '../../../../../../../plugins/data/public';
import { formatListAsProse, parseCommaSeparatedList } from '../../../../../../utils';
import { AggParam, FieldParamType } from '../../../../agg_types';
import { AggParamEditorProps, ComboBoxGroupedOptions } from '..';

const label = i18n.translate('common.ui.aggTypes.field.fieldLabel', { defaultMessage: 'Field' });

export interface FieldParamEditorProps extends AggParamEditorProps<Field> {
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
  const selectedOptions: ComboBoxGroupedOptions<Field> = value
    ? [{ label: value.displayName || value.name, target: value }]
    : [];

  const onChange = (options: EuiComboBoxOptionProps[]) => {
    const selectedOption: Field = get(options, '0.target');
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
      i18n.translate('common.ui.aggTypes.field.noCompatibleFieldsDescription', {
        defaultMessage:
          'The index pattern {indexPatternTitle} does not contain any of the following compatible field types: {fieldTypes}',
        values: {
          indexPatternTitle: agg.getIndexPattern && agg.getIndexPattern().title,
          fieldTypes: getFieldTypesString(agg),
        },
      })
    );
  }

  const isValid = !!value && !errors.length;

  useEffect(() => {
    setValidity(isValid);

    if (!!errors.length) {
      setTouched();
    }
  }, [isValid]);

  useEffect(() => {
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
  }, []);

  return (
    <EuiFormRow
      label={customLabel || label}
      isInvalid={showValidation ? !isValid : false}
      fullWidth={true}
      error={errors}
      compressed
    >
      <EuiComboBox
        compressed
        placeholder={i18n.translate('common.ui.aggTypes.field.selectFieldPlaceholder', {
          defaultMessage: 'Select a field',
        })}
        options={indexedFields}
        isDisabled={!indexedFields.length}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        isInvalid={showValidation ? !isValid : false}
        onChange={onChange}
        onBlur={setTouched}
        data-test-subj="visDefaultEditorField"
        fullWidth={true}
      />
    </EuiFormRow>
  );
}

function getFieldTypesString(agg: AggConfig) {
  const param =
    get(agg, 'type.params', []).find((p: AggParam) => p.name === 'field') || ({} as FieldParamType);
  return formatListAsProse(parseCommaSeparatedList(param.filterFieldTypes), { inclusive: false });
}

export { FieldParamEditor };
