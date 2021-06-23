/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useContext } from 'react';
import {
  EuiComboBox,
  EuiComboBoxProps,
  EuiComboBoxOptionOption,
  EuiFormRow,
  htmlIdGenerator,
} from '@elastic/eui';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';
import type { SanitizedFieldType, IndexPatternValue } from '../../../../common/types';
import type { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';

// @ts-ignore
import { isFieldEnabled } from '../../lib/check_ui_restrictions';
import { PanelModelContext } from '../../contexts/panel_model_context';
import { USE_KIBANA_INDEXES_KEY } from '../../../../common/constants';

interface FieldSelectProps {
  label: string | ReactNode;
  type: string;
  fields: Record<string, SanitizedFieldType[]>;
  indexPattern: IndexPatternValue;
  value?: string | null;
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
  label,
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
  const panelModel = useContext(PanelModelContext);
  const htmlId = htmlIdGenerator();

  let selectedOptions: Array<EuiComboBoxOptionOption<string>> = [];
  let newPlaceholder = placeholder;
  const fieldsSelector = getIndexPatternKey(indexPattern);

  const groupedOptions: EuiComboBoxProps<string>['options'] = Object.values(
    (fields[fieldsSelector] || []).reduce<Record<string, EuiComboBoxOptionOption<string>>>(
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

  let isInvalid;

  if (Boolean(panelModel?.[USE_KIBANA_INDEXES_KEY])) {
    isInvalid = Boolean(value && fields[fieldsSelector] && !selectedOptions.length);

    if (value && !selectedOptions.length) {
      selectedOptions = [{ label: value!, id: 'INVALID_FIELD' }];
    }
  } else {
    if (value && fields[fieldsSelector] && !selectedOptions.length) {
      onChange([]);
    }
  }

  return (
    <EuiFormRow
      id={htmlId('timeField')}
      label={label}
      isInvalid={isInvalid}
      error={i18n.translate('visTypeTimeseries.fieldSelect.fieldIsNotValid', {
        defaultMessage:
          'The "{fieldParameter}" field is not valid for use with the current index. Please select a new field.',
        values: {
          fieldParameter: value,
        },
      })}
    >
      <EuiComboBox
        data-test-subj={dataTestSubj}
        placeholder={newPlaceholder}
        isDisabled={disabled}
        options={groupedOptions}
        selectedOptions={selectedOptions}
        onChange={onChange}
        singleSelection={{ asPlainText: true }}
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
}
