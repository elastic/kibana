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

import { TimestampOption } from '../../types';
import { schema } from '../form_schema';

interface Props {
  options: TimestampOption[];
  isLoadingOptions: boolean;
  isExistingIndexPattern: boolean;
  isLoadingMatchedIndices: boolean;
  hasMatchedIndices: boolean;
}

const requireTimestampOptionValidator = (options: Props['options']): ValidationConfig => ({
  validator: async ({ value }) => {
    const isValueRequired = !!options.length;
    if (isValueRequired && !value) {
      return {
        message: i18n.translate(
          'indexPatternEditor.requireTimestampOption.ValidationErrorMessage',
          {
            defaultMessage: 'Select a timestamp field.',
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

const noTimestampOptionText = i18n.translate('indexPatternEditor.editor.form.noTimeFieldsLabel', {
  defaultMessage: 'No matching data stream, index, or index alias has a timestamp field.',
});

const timestampFieldHelp = i18n.translate('indexPatternEditor.editor.form.timeFieldHelp', {
  defaultMessage: 'Select a timestamp field for use with the global time filter.',
});

export const TimestampField = ({
  options = [],
  isLoadingOptions = false,
  isExistingIndexPattern,
  isLoadingMatchedIndices,
  hasMatchedIndices,
}: Props) => {
  const optionsAsComboBoxOptions = options.map(({ display, fieldName }) => ({
    label: display,
    value: fieldName,
  }));
  const timestampConfig = useMemo(() => getTimestampConfig(options), [options]);
  const selectTimestampHelp = options.length ? timestampFieldHelp : '';

  const timestampNoFieldsHelp =
    options.length === 0 &&
    !isExistingIndexPattern &&
    !isLoadingMatchedIndices &&
    !isLoadingOptions &&
    hasMatchedIndices
      ? noTimestampOptionText
      : '';

  return (
    <UseField<EuiComboBoxOptionOption<string>> config={timestampConfig} path="timestampField">
      {(field) => {
        const { label, value, setValue } = field;

        if (value === undefined) {
          return null;
        }

        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        const isDisabled = !optionsAsComboBoxOptions.length;

        if (!value && !isDisabled) {
          const val = optionsAsComboBoxOptions.filter((el) => el.value === '@timestamp');
          if (val.length) {
            setValue(val[0]);
          }
        }

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
                <EuiFormHelpText>
                  {timestampNoFieldsHelp || selectTimestampHelp || <>&nbsp;</>}
                </EuiFormHelpText>
              </>
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};
