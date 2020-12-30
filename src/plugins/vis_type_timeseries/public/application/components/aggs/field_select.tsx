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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxProps, EuiComboBoxOptionOption } from '@elastic/eui';
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
  onChange: (options: Array<EuiComboBoxOptionOption<string>>) => void;
  disabled?: boolean;
  restrict?: string[];
  placeholder?: string;
  uiRestrictions?: TimeseriesUIRestrictions;
}

const isFieldTypeEnabled = (fieldRestrictions: string[], fieldType: string) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

const defaultPlaceholder = i18n.translate('visTypeTimeseries.fieldSelect.selectFieldPlaceholder', {
  defaultMessage: 'Select field...',
});

export function FieldSelect({
  type,
  fields,
  indexPattern = '',
  value = '',
  onChange,
  disabled = false,
  restrict = [],
  placeholder = defaultPlaceholder,
  uiRestrictions,
}: FieldSelectProps) {
  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = [];
  let newPlaceholder = placeholder;
  const options: EuiComboBoxProps<string>['options'] = Object.values(
    (fields[indexPattern] || []).reduce<Record<string, EuiComboBoxOptionOption<string>>>(
      (acc, field) => {
        if (placeholder === field?.name) {
          newPlaceholder = field.label ?? field.name;
        }

        if (
          isFieldTypeEnabled(restrict, field.type) &&
          isFieldEnabled(field.name, type, uiRestrictions)
        ) {
          const item: EuiComboBoxOptionOption<string> = {
            value: field.name,
            label: field.label ?? field.name,
          };

          const fieldTypeOptions = acc[field.type]?.options;

          if (fieldTypeOptions) {
            fieldTypeOptions.push(item);
          } else {
            acc[field.type] = {
              options: [item],
              label: field.type,
            };
          }

          if (value === item.value) {
            selectedOptions.push(item);
          }
        }

        return acc;
      },
      {}
    )
  );

  if (type === METRIC_TYPES.COUNT) {
    return null;
  }

  if (value && !selectedOptions.length) {
    onChange([]);
  }

  return (
    <EuiComboBox
      placeholder={newPlaceholder}
      isDisabled={disabled}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
    />
  );
}
