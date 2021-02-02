/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { FieldHook, VALIDATION_TYPES, FieldValidateResponse } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const ComboBoxField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  // Errors for the comboBox value (the "array")
  const errorMessageField = field.getErrorsMessages();

  // Errors for comboBox option added (the array "item")
  const errorMessageArrayItem = field.getErrorsMessages({
    validationType: VALIDATION_TYPES.ARRAY_ITEM,
  });

  const isInvalid = field.errors.length
    ? errorMessageField !== null || errorMessageArrayItem !== null
    : false;

  // Concatenate error messages.
  const errorMessage =
    errorMessageField && errorMessageArrayItem
      ? `${errorMessageField}, ${errorMessageArrayItem}`
      : errorMessageField
      ? errorMessageField
      : errorMessageArrayItem;

  const onCreateComboOption = (value: string) => {
    // Note: for now, all validations for a comboBox array item have to be synchronous
    // If there is a need to support asynchronous validation, we'll work on it (and will need to update the <EuiComboBox /> logic).
    const { isValid } = field.validate({
      value,
      validationType: VALIDATION_TYPES.ARRAY_ITEM,
    }) as FieldValidateResponse;

    if (!isValid) {
      // Return false to explicitly reject the user's input.
      return false;
    }

    const newValue = [...(field.value as string[]), value];

    field.setValue(newValue);
  };

  const onComboChange = (options: EuiComboBoxOptionOption[]) => {
    field.setValue(options.map((option) => option.label));
  };

  const onSearchComboChange = (value: string) => {
    if (value !== undefined) {
      field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
    }
  };

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiComboBox
        noSuggestions
        placeholder={i18n.translate('esUi.forms.comboBoxField.placeHolderText', {
          defaultMessage: 'Type and then hit "ENTER"',
        })}
        selectedOptions={(field.value as any[]).map((v) => ({ label: v }))}
        onCreateOption={onCreateComboOption}
        onChange={onComboChange}
        onSearchChange={onSearchComboChange}
        fullWidth
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
