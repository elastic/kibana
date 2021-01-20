/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  'data-test-subj'?: string;
}

const defaultPlaceholder = i18n.translate('visTypeTimeseries.fieldSelect.selectFieldPlaceholder', {
  defaultMessage: 'Select field...',
});

const isFieldTypeEnabled = (fieldRestrictions: string[], fieldType: string) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

const sortByLabel = (a: EuiComboBoxOptionOption<string>, b: EuiComboBoxOptionOption<string>) => {
  const getNormalizedString = (option: EuiComboBoxOptionOption<string>) =>
    (option.label || '').toLowerCase();

  return getNormalizedString(a).localeCompare(getNormalizedString(b));
};

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
  'data-test-subj': dataTestSubj = 'metricsIndexPatternFieldsSelect',
}: FieldSelectProps) {
  if (type === METRIC_TYPES.COUNT) {
    return null;
  }

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = [];
  let newPlaceholder = placeholder;
  const groupedOptions: EuiComboBoxProps<string>['options'] = Object.values(
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

  // sort groups
  groupedOptions.sort(sortByLabel);

  // sort items
  groupedOptions.forEach((group) => {
    if (Array.isArray(group.options)) {
      group.options.sort(sortByLabel);
    }
  });

  if (value && !selectedOptions.length) {
    onChange([]);
  }

  return (
    <EuiComboBox
      data-test-subj={dataTestSubj}
      placeholder={newPlaceholder}
      isDisabled={disabled}
      options={groupedOptions}
      selectedOptions={selectedOptions}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
    />
  );
}
