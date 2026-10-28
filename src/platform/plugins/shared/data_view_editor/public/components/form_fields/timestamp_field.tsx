/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCode,
  EuiComboBox,
  EuiFormHelpText,
  EuiFormRow,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { matchedIndiciesDefault } from '../../data_view_editor_service';

import type { FieldConfig, FieldHook, ValidationConfig } from '../../shared_imports';
import { UseField, getFieldValidityAndErrorMessage } from '../../shared_imports';

import type { TimestampOption, MatchedIndicesSet } from '../../types';
import { schema } from '../form_schema';

interface Props {
  options$: Observable<TimestampOption[]>;
  isLoadingOptions$: Observable<boolean>;
  matchedIndices$: Observable<MatchedIndicesSet>;
  optionsError$: Observable<Error | undefined>;
  disabled?: boolean;
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

const getTimestampOptionsErrorText = (error: Error) =>
  i18n.translate('indexPatternEditor.editor.form.timeFieldsError', {
    defaultMessage: "Couldn't retrieve the list of timestamp fields: {message}",
    values: { message: error.message },
  });

const getHelpText = ({
  options,
  isLoadingOptions,
  hasMatchedIndices,
  optionsError,
}: {
  options: TimestampOption[];
  isLoadingOptions: boolean;
  hasMatchedIndices: boolean;
  optionsError?: Error;
}): ReactNode => {
  if (!isLoadingOptions && optionsError) {
    return (
      <EuiTextColor color="danger" data-test-subj="timestampFieldError">
        {getTimestampOptionsErrorText(optionsError)}
      </EuiTextColor>
    );
  }
  if (!isLoadingOptions && hasMatchedIndices && !options.length) {
    return noTimestampOptionText;
  }
  if (options.length) {
    return timestampFieldHelp;
  }
  return <>&nbsp;</>;
};

export const TimestampField = ({
  options$,
  isLoadingOptions$,
  matchedIndices$,
  optionsError$,
  disabled,
}: Props) => {
  const options = useObservable<TimestampOption[]>(options$, []);
  const isLoadingOptions = useObservable<boolean>(isLoadingOptions$, false);
  const optionsError = useObservable<Error | undefined>(optionsError$);
  const hasMatchedIndices = !!useObservable(matchedIndices$, matchedIndiciesDefault)
    .exactMatchedIndices.length;

  const optionsAsComboBoxOptions = options.map(({ display, fieldName }) => ({
    label: display,
    value: fieldName,
  }));

  const timestampConfig = useMemo(() => getTimestampConfig(options), [options]);
  const helpText = getHelpText({ options, isLoadingOptions, hasMatchedIndices, optionsError });
  // the options only reflect the date fields of the matching indices once they are loaded without an error
  const areOptionsLoaded = !isLoadingOptions && !optionsError && hasMatchedIndices;

  return (
    <UseField<EuiComboBoxOptionOption<string>> config={timestampConfig} path="timestampField">
      {(field) => {
        if (field.value === undefined) {
          return null;
        }

        return (
          <TimestampFieldRenderer
            field={field}
            optionsAsComboBoxOptions={optionsAsComboBoxOptions}
            isLoadingOptions={isLoadingOptions}
            areOptionsLoaded={areOptionsLoaded}
            disabled={disabled}
            helpText={helpText}
          />
        );
      }}
    </UseField>
  );
};

interface TimestampFieldRendererProps {
  field: FieldHook<EuiComboBoxOptionOption<string>>;
  optionsAsComboBoxOptions: Array<EuiComboBoxOptionOption<string>>;
  isLoadingOptions: boolean;
  areOptionsLoaded: boolean;
  disabled?: boolean;
  helpText: ReactNode;
}

const TimestampFieldRenderer = ({
  field,
  optionsAsComboBoxOptions,
  isLoadingOptions,
  areOptionsLoaded,
  disabled,
  helpText,
}: TimestampFieldRendererProps) => {
  const { label, value, setValue, reset } = field;
  const wasValueInTheListRef = useRef(false);

  const isDisabled = !optionsAsComboBoxOptions.length || isLoadingOptions || disabled;
  const valueInList = optionsAsComboBoxOptions.some((option) => option.value === value.value);
  const isSavedValueMissingInList =
    Boolean(value.value) && !valueInList && !wasValueInTheListRef.current;

  useEffect(() => {
    if (valueInList) {
      wasValueInTheListRef.current = true;
      return;
    }

    // Keep the saved timestamp field which is missing in the list, so the user is told about it
    // instead of silently replacing it with @timestamp
    if (isSavedValueMissingInList) {
      return;
    }

    // Auto-select @timestamp when no valid value is selected and the field is active
    if ((!value || !valueInList) && !isDisabled) {
      const timestampOption = optionsAsComboBoxOptions.find((el) => el.value === '@timestamp');
      if (timestampOption) {
        wasValueInTheListRef.current = true;
        setValue(timestampOption);
        return;
      }
    }

    // Reset when options changed and the previously valid value is no longer available
    if (!isLoadingOptions && value?.value && wasValueInTheListRef.current) {
      wasValueInTheListRef.current = false;
      reset();
    }
  }, [
    optionsAsComboBoxOptions,
    value,
    isDisabled,
    isLoadingOptions,
    setValue,
    reset,
    valueInList,
    isSavedValueMissingInList,
  ]);

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const isComboBoxInvalid = !isDisabled && isInvalid;

  return (
    <>
      <EuiFormRow
        label={label}
        error={isDisabled ? null : errorMessage}
        isInvalid={isComboBoxInvalid}
        fullWidth
      >
        <>
          <EuiComboBox<string>
            isInvalid={isComboBoxInvalid}
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
              setValue(newValue[0]);
            }}
            isClearable={false}
            isDisabled={isDisabled}
            data-test-subj="timestampField"
            aria-label={i18n.translate('indexPatternEditor.editor.form.timestampSelectAriaLabel', {
              defaultMessage: 'Timestamp field',
            })}
            isLoading={isLoadingOptions}
            data-is-loading={isLoadingOptions ? '1' : '0'}
            fullWidth
          />
          <EuiFormHelpText>{helpText}</EuiFormHelpText>
        </>
      </EuiFormRow>
      {areOptionsLoaded && isSavedValueMissingInList && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            data-test-subj="timestampFieldNotFoundCallout"
            title={
              <FormattedMessage
                id="indexPatternEditor.editor.form.timestampFieldNotFoundWarning"
                defaultMessage="This data view uses {fieldName} as its timestamp field, but no matching data stream, index, or index alias has that field."
                values={{ fieldName: <EuiCode>{value.value}</EuiCode> }}
              />
            }
          />
        </>
      )}
    </>
  );
};
