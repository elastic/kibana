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

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';
import { METRIC_TYPES } from '../../../../common/metric_types';

import type { SanitizedFieldType } from '../../../../common/types';
import type { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';

// @ts-ignore
import { isFieldEnabled } from '../../lib/check_ui_restrictions';

interface FieldSelectProps {
  type: string;
  fields: Record<string, SanitizedFieldType[]>;
  indexPattern: string;
  value: string;
  onChange: EuiComboBoxProps<string>['onChange'];
  disabled: boolean;
  restrict: string[];
  placeholder: string;
  uiRestrictions: TimeseriesUIRestrictions;
}

const isFieldTypeEnabled = (fieldRestrictions: string[], fieldType: string) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

export function FieldSelect({
  type,
  fields,
  indexPattern,
  value,
  onChange,
  disabled,
  restrict,
  placeholder,
  uiRestrictions,
}: FieldSelectProps) {
  const [options, setOptions] = useState<EuiComboBoxProps<string>['options']>([]);
  const [selectedOptions, setSelectedOptions] = useState<
    EuiComboBoxProps<string>['selectedOptions']
  >([]);
  const [actualPlaceholder, setActualPlaceholder] = useState<string>();

  useEffect(() => {
    const newSelectedOptions: EuiComboBoxProps<string>['selectedOptions'] = [];
    let newPlaceholder = placeholder;
    const newOptions: EuiComboBoxProps<string>['options'] = Object.values(
      (fields[indexPattern] || []).reduce((acc, field) => {
        if (placeholder === field?.name) {
          newPlaceholder = field.label ?? field.name;
        }

        if (
          isFieldTypeEnabled(restrict, field.type) &&
          isFieldEnabled(field.name, type, uiRestrictions)
        ) {
          const item = {
            value: field.name,
            label: field.label ?? field.name,
          };

          if (acc[field.type]) {
            acc[field.type].options.push(item);
          } else {
            acc[field.type] = {
              options: [item],
              label: field.type,
            };
          }

          if (value === item.value) {
            newSelectedOptions.push(item);
          }
        }

        return acc;
      }, {})
    );
    setOptions(newOptions);
    setActualPlaceholder(newPlaceholder);
    setSelectedOptions(newSelectedOptions);
  }, [type, fields, indexPattern, value, restrict, placeholder, uiRestrictions]);

  if (type === METRIC_TYPES.COUNT) {
    return null;
  }

  return (
    <EuiComboBox
      placeholder={actualPlaceholder}
      isDisabled={disabled}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
    />
  );
}

FieldSelect.defaultProps = {
  indexPattern: '',
  disabled: false,
  restrict: [],
  placeholder: i18n.translate('visTypeTimeseries.fieldSelect.selectFieldPlaceholder', {
    defaultMessage: 'Select field...',
  }),
};
