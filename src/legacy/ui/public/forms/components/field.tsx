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
  EuiComboBox,
  EuiComboBoxOptionProps,
} from '@elastic/eui';
import { Field as FieldType } from 'ui/forms/use_form';

interface Props {
  field: FieldType;
}

export const Field = ({ field }: Props) => {
  const isInvalid = !field.isUpdating && field.form.isSubmitted && field.errors.length > 0;

  const onAddValueToCombo = (value: string) => {
    const newValue = [...(field.value as string[]), value];

    /**
     * There is a strange behaviour in the EUI Combobox component
     * If the value to be added is immediately set (no timeout) with the keyboard ENTER
     * key, then the event bubbles and the pill that is added receive the ENTER event
     * "on" the close icon (the cross) that triggers the "remove item" callback.
     * The behaviour does not occur with the "onBlur" as no key is pressed.
     *
     * I played around and added 1000ms to better see the issue. We can see clearly the
     * difference between the keydown "ENTER" and the "onBlur" triggers.
     * This needs to be investigated.
     */
    setTimeout(() => {
      field.setValue(newValue);
    }, 1000);

    // The following line should be the correct way to update the value
    // but it does not currently work when hitting the "ENTER" key

    // field.setValue(newValue);
  };

  const onComboUpdate = (options: EuiComboBoxOptionProps[]) => {
    field.setValue(options.map(option => option.label));
  };

  const renderField = () => {
    switch (field.type) {
      case 'number':
        return (
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={field.value as string}
            onChange={field.onChange}
            // disabled={disabled === true}
            isLoading={field.isValidating}
            fullWidth
          />
        );
      case 'comboBox':
        return (
          <EuiComboBox
            noSuggestions
            placeholder="Type and then hit ENTER"
            selectedOptions={(field.value as any[]).map(v => ({ label: v }))}
            onCreateOption={onAddValueToCombo}
            onChange={onComboUpdate}
            // onSearchChange={this.onLeaderIndexPatternInputChange}
            fullWidth
          />
        );
      default:
        return (
          <EuiFieldText
            isInvalid={isInvalid}
            value={field.value as string}
            onChange={field.onChange}
            isLoading={field.isValidating}
            fullWidth
          />
        );
    }
  };

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={!field.isUpdating && field.errors.length && field.errors[0].message}
      isInvalid={isInvalid}
      fullWidth
    >
      {renderField()}
    </EuiFormRow>
  );
};
