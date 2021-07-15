/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiComboBox, EuiFormHelpText, EuiComboBoxOptionOption } from '@elastic/eui';

import {
  UseField,
  FieldConfig,
  ValidationConfig,
  getFieldValidityAndErrorMessage,
} from '../../shared_imports';

import { TimestampOption } from '../index_pattern_editor_flyout_content';
import { schema } from '../form_schema';

interface Props {
  options: TimestampOption[];
  isLoadingOptions: boolean;
  helpText: string;
}

const requireTimestampOptionValidator = (options: Props['options']): ValidationConfig => ({
  validator: async ({ value }) => {
    const isValueRequired = !!options.length;
    if (isValueRequired && !value) {
      return {
        message: i18n.translate(
          'indexPatternEditor.requireTimestampOption.ValidationErrorMessage',
          {
            defaultMessage: 'Please select a timestamp field option.',
          }
        ),
      };
    }
  },
});

const getTimestampConfig = (
  options: Props['options']
): FieldConfig<EuiComboBoxOptionOption<string>> => {
  const timestampFieldConfig = schema.timestampField;

  const validations = [
    ...timestampFieldConfig.validations,
    // note this is responsible for triggering the state update for the selected source list.
    requireTimestampOptionValidator(options),
  ];

  return {
    ...timestampFieldConfig!,
    validations,
  };
};

export const TimestampField = ({
  options = [],
  helpText = '',
  isLoadingOptions = false,
}: Props) => {
  const optionsAsComboBoxOptions = options.map(({ display, fieldName }) => ({
    label: display,
    value: fieldName,
  }));
  const timestampConfig = useMemo(() => getTimestampConfig(options), [options]);

  return (
    <UseField<EuiComboBoxOptionOption<string>> config={timestampConfig} path="timestampField">
      {(field) => {
        const { label, value, setValue } = field;

        if (value === undefined) {
          return null;
        }

        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        const isDisabled = !optionsAsComboBoxOptions.length;

        return (
          <>
            <EuiFormRow
              label={label}
              error={isDisabled ? null : errorMessage}
              isInvalid={!isDisabled && isInvalid}
              fullWidth
            >
              <>
                <EuiComboBox<string>
                  placeholder={i18n.translate(
                    'indexPatternEditor.editor.form.runtimeType.placeholderLabel',
                    {
                      defaultMessage: 'Select a timestamp field',
                    }
                  )}
                  singleSelection={{ asPlainText: true }}
                  options={optionsAsComboBoxOptions}
                  selectedOptions={value ? [value] : undefined}
                  onChange={(newValue) => {
                    if (newValue.length === 0) {
                      // Don't allow clearing the type. One must always be selected
                      return;
                    }
                    //
                    setValue(newValue[0]);
                  }}
                  isClearable={false}
                  isDisabled={isDisabled}
                  data-test-subj="timestampField"
                  aria-label={i18n.translate(
                    'indexPatternEditor.editor.form.timestampSelectAriaLabel',
                    {
                      defaultMessage: 'Timestamp field',
                    }
                  )}
                  isLoading={isLoadingOptions}
                  fullWidth
                />
                <EuiFormHelpText>{helpText || <>&nbsp;</>}</EuiFormHelpText>
              </>
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};
