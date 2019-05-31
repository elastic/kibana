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
import { AggConfig } from 'ui/vis';
import { formatListAsProse, parseCommaSeparatedList } from '../../../../utils';
import { AggParamEditorProps } from '../../vis/editors/default';
import { ComboBoxGroupedOption } from '../../vis/editors/default/default_editor_utils';
import { FieldParamType } from '../param_types';

const label = i18n.translate('common.ui.aggTypes.field.fieldLabel', { defaultMessage: 'Field' });

interface FieldParamEditorProps extends AggParamEditorProps<FieldParamType> {
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
  const selectedOptions: ComboBoxGroupedOption[] = value
    ? [{ label: value.displayName, value }]
    : [];

  const onChange = (options: EuiComboBoxOptionProps[]) => {
    const selectedOption = get(options, '0.value');
    if (!(aggParam.required && !selectedOption)) {
      setValue(selectedOption);
    }

    if (aggParam.onChange) {
      aggParam.onChange(agg);
    }
  };
  const errors = [];

  if (customError) {
    errors.push(customError);
  }

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
    setTouched();
  }

  const isValid = !!value && !errors.length;

  useEffect(
    () => {
      setValidity(isValid);
    },
    [isValid]
  );

  useEffect(() => {
    // set field if only one available
    if (indexedFields.length !== 1) {
      return;
    }

    const options = indexedFields[0].options;

    if (!options) {
      setValue(indexedFields[0].value);
    } else if (options.length === 1) {
      setValue(options[0].value);
    }
  }, []);

  return (
    <EuiFormRow
      label={customLabel || label}
      isInvalid={showValidation ? !isValid : false}
      fullWidth={true}
      error={errors}
      className="visEditorSidebar__aggParamFormRow"
    >
      <EuiComboBox
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
  return formatListAsProse(
    parseCommaSeparatedList(get(agg, 'type.params.byName.field.filterFieldTypes')),
    { inclusive: false }
  );
}

export { FieldParamEditor };
