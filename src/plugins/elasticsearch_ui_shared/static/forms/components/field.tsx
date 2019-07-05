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
import {
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiSelect,
  EuiComboBox,
  EuiSwitch,
  EuiSelectable,
  EuiPanel,
  EuiComboBoxOptionProps,
} from '@elastic/eui';
import {
  Field as FieldType,
  FIELD_TYPES,
  VALIDATION_TYPES,
  FieldValidateResponse,
} from '../hook_form_lib';

interface Props {
  field: FieldType;
  fieldProps?: Record<string, any>;
}

export const Field = ({ field, fieldProps = {} }: Props) => {
  let isInvalid: boolean;
  let errorMessage: string | null;

  if (field.type === FIELD_TYPES.COMBO_BOX) {
    // Errors for the comboBox value (the "array")
    const errorMessageField = field.form.isSubmitted ? field.getErrorsMessages() : '';

    // Errors for comboBox option added (the array "item")
    const errorMessageArrayItem = field.getErrorsMessages(VALIDATION_TYPES.ARRAY_ITEM);

    isInvalid = field.errors.length
      ? field.form.isSubmitted || errorMessageArrayItem !== null
      : false;

    // Concatenate error messages.
    errorMessage =
      errorMessageField && errorMessageArrayItem
        ? `${errorMessageField}, ${errorMessageArrayItem}`
        : errorMessageField
        ? errorMessageField
        : errorMessageArrayItem;
  } else {
    isInvalid = !field.isUpdating && field.form.isSubmitted && field.errors.length > 0;
    errorMessage =
      !field.isUpdating && field.errors.length ? (field.errors[0].message as string) : null;
  }

  /**
   * There is a strange behaviour in the EUI Combobox component:
   * If the value to be added is immediately set (without any timeout)
   * by hitting the keyboard "ENTER" key, the event bubbles and the pill that is added
   * receive the same keyDown ENTER event. This triggers immediately the close icon button on the pill
   * that triggers the "remove item" callback.
   * The behaviour does not occur with the "onBlur" as no Key is pressed.
   *
   * This needs to be investigated.
   */
  const onCreateComboOption = async (value: string) => {
    // Note: for now, we assume that all validations for a comboBox are synchronous
    // This could change in the future, but not before we fix the current issue with the ENTER key
    // Asynchronous validation adds another place to look to understand the event change problem,
    // so I prefer to limit places to look at to fix the issue.
    // Once we get the comboBox to work as expected with synchronous validations,
    // we can see if asynchronous validation can also work (and if it would make sense to allow it).
    const { isValid } = field.validate({ value }) as FieldValidateResponse;

    if (!isValid) {
      setTimeout(() => {
        field.setValue(field.value as string[]);
      });
      return;
    }

    const newValue = [...(field.value as string[]), value];

    setTimeout(() => {
      field.setValue(newValue);
    });

    // The following line should be the correct way to update the value
    // but it does not currently work when hitting the "ENTER" key

    // field.setValue(newValue);
  };

  const onComboChange = (options: EuiComboBoxOptionProps[]) => {
    field.setValue(options.map(option => option.label));
  };

  const onSearchComboChange = (value: string) => {
    if (value) {
      field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case FIELD_TYPES.NUMBER:
        return (
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={field.value as string}
            onChange={field.onChange}
            isLoading={field.isValidating}
            fullWidth
            {...fieldProps}
          />
        );
      case FIELD_TYPES.SELECT:
        return (
          <EuiSelect
            fullWidth
            value={field.value as string}
            onChange={e => {
              field.setValue(e.target.value);
            }}
            hasNoInitialSelection={true}
            isInvalid={false}
            {...(fieldProps as { options: any; [key: string]: any })}
          />
        );
      case FIELD_TYPES.COMBO_BOX:
        return (
          <EuiComboBox
            noSuggestions
            placeholder="Type and then hit ENTER"
            selectedOptions={(field.value as any[]).map(v => ({ label: v }))}
            onCreateOption={onCreateComboOption}
            onChange={onComboChange}
            onSearchChange={onSearchComboChange}
            fullWidth
            {...fieldProps}
          />
        );
      case FIELD_TYPES.TOGGLE:
        return (
          <EuiSwitch
            label={field.label}
            checked={field.value as boolean}
            onChange={field.onChange}
            {...fieldProps}
          />
        );
      case FIELD_TYPES.MULTI_SELECT:
        return (
          <EuiSelectable
            allowExclusions={false}
            height={300}
            onChange={options => {
              field.setValue(options);
            }}
            options={field.value as any[]}
            {...fieldProps}
          >
            {(list, search) => (
              <EuiPanel paddingSize="s" hasShadow={false}>
                {search}
                {list}
              </EuiPanel>
            )}
          </EuiSelectable>
        );
      default:
        return (
          <EuiFieldText
            isInvalid={isInvalid}
            value={field.value as string}
            onChange={field.onChange}
            isLoading={field.isValidating}
            fullWidth
            {...fieldProps}
          />
        );
    }
  };

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      {renderField()}
    </EuiFormRow>
  );
};
