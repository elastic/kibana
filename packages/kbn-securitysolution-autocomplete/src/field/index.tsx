/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FieldProps } from './types';
import { useField } from './use_field';

const AS_PLAIN_TEXT = { asPlainText: true };

export const FieldComponent: React.FC<FieldProps> = ({
  fieldInputWidth,
  fieldTypeFilter = [],
  indexPattern,
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  isRequired = false,
  onChange,
  placeholder,
  selectedField,
  acceptsCustomOptions = false,
  showMappingConflicts = false,
  'aria-label': ariaLabel,
}): JSX.Element => {
  const {
    isInvalid,
    comboOptions,
    selectedComboOptions,
    fieldWidth,

    renderFields,
    handleTouch,
    handleValuesChange,
    handleCreateCustomOption,
  } = useField({
    indexPattern,
    fieldTypeFilter,
    isRequired,
    selectedField,
    fieldInputWidth,
    showMappingConflicts,
    onChange,
  });

  if (acceptsCustomOptions) {
    return (
      <EuiComboBox
        placeholder={placeholder}
        options={comboOptions}
        selectedOptions={selectedComboOptions}
        onChange={handleValuesChange}
        isLoading={isLoading}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isInvalid={isInvalid}
        onFocus={handleTouch}
        singleSelection={AS_PLAIN_TEXT}
        data-test-subj="fieldAutocompleteComboBox"
        style={fieldWidth}
        onCreateOption={handleCreateCustomOption}
        customOptionText={i18n.translate('autocomplete.customOptionText', {
          defaultMessage: 'Add {searchValuePlaceholder} as a custom field',
          values: { searchValuePlaceholder: '{searchValue}' },
        })}
        fullWidth
        renderOption={renderFields}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isInvalid={isInvalid}
      onFocus={handleTouch}
      singleSelection={AS_PLAIN_TEXT}
      data-test-subj="fieldAutocompleteComboBox"
      style={fieldWidth}
      fullWidth
      renderOption={renderFields}
      aria-label={ariaLabel}
    />
  );
};

FieldComponent.displayName = 'Field';
