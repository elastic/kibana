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
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { FieldHook, VALIDATION_TYPES, FieldValidateResponse } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const ComboBoxField = ({ field, euiFieldProps = {}, ...rest }: Props) => {
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

  const onComboChange = (options: EuiComboBoxOptionProps[]) => {
    field.setValue(options.map(option => option.label));
  };

  const onSearchComboChange = (value: string) => {
    if (value) {
      field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
    }
  };

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={rest['data-test-subj']}
      describedByIds={rest.idAria ? [rest.idAria] : undefined}
    >
      <EuiComboBox
        noSuggestions
        placeholder={i18n.translate('esUi.forms.comboBoxField.placeHolderText', {
          defaultMessage: 'Type and then hit "ENTER"',
        })}
        selectedOptions={(field.value as any[]).map(v => ({ label: v }))}
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
