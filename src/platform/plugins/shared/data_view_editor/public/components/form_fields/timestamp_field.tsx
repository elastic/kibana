/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { EuiFormRow, EuiComboBox, EuiFormHelpText, EuiComboBoxOptionOption } from '@elastic/eui';
import { matchedIndiciesDefault } from '../../data_view_editor_service';

import {
  UseField,
  FieldConfig,
  ValidationConfig,
  getFieldValidityAndErrorMessage,
} from '../../shared_imports';

import { TimestampOption, MatchedIndicesSet } from '../../types';
import { schema } from '../form_schema';

interface Props {
  options$: Observable<TimestampOption[]>;
  isLoadingOptions$: Observable<boolean>;
  matchedIndices$: Observable<MatchedIndicesSet>;
}

export const requireTimestampOptionValidator = (
  options: TimestampOption[]
): ValidationConfig<any, string, { value?: any }> => ({
  validator: async ({ value: selectedOption }) => {
    const isValueRequired = !!options.length;
    const valueSelected = options.find((item) => item.fieldName === selectedOption?.value);
    if (isValueRequired && (!selectedOption || !valueSelected)) {
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
  options: TimestampOption[]
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

export const TimestampField = ({ options$, isLoadingOptions$, matchedIndices$ }: Props) => {
  const options = useObservable<TimestampOption[]>(options$, []);
  const isLoadingOptions = useObservable<boolean>(isLoadingOptions$, false);
  const hasMatchedIndices = !!useObservable(matchedIndices$, matchedIndiciesDefault)
    .exactMatchedIndices.length;

  const optionsAsComboBoxOptions = options.map(({ display, fieldName }) => ({
    label: display,
    value: fieldName,
  }));

  const timestampConfig = useMemo(() => getTimestampConfig(options), [options]);
  const selectTimestampHelp = options.length ? timestampFieldHelp : '';

  const timestampNoFieldsHelp =
    options.length === 0 && !isLoadingOptions && hasMatchedIndices ? noTimestampOptionText : '';

  return (
    <UseField<EuiComboBoxOptionOption<string>> config={timestampConfig} path="timestampField">
      {(field) => {
        const { label, value, setValue } = field;

        if (value === undefined) {
          return null;
        }

        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        const isDisabled = !optionsAsComboBoxOptions.length || isLoadingOptions;
        // if the value isn't in the list then don't use it.
        const valueInList = !!optionsAsComboBoxOptions.find(
          (option) => option.value === value.value
        );

        if ((!value || !valueInList) && !isDisabled) {
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
                  selectedOptions={value && valueInList ? [value] : undefined}
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
                  data-is-loading={isLoadingOptions ? '1' : '0'}
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
