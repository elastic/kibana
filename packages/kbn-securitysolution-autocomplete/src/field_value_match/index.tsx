/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  EuiSuperSelect,
  EuiFormRow,
  EuiFieldNumber,
  EuiComboBoxOptionOption,
  EuiComboBox,
} from '@elastic/eui';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import { uniq } from 'lodash';

import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/100715
// import { AutocompleteStart } from '../../../../../../../src/plugins/data/public';
type AutocompleteStart = any;

import * as i18n from '../translations';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import {
  getGenericComboBoxProps,
  GetGenericComboBoxPropsReturn,
} from '../get_generic_combo_box_props';
import { paramIsValid } from '../param_is_valid';

const BOOLEAN_OPTIONS = [
  { inputDisplay: 'true', value: 'true' },
  { inputDisplay: 'false', value: 'false' },
];

const SINGLE_SELECTION = { asPlainText: true };

interface AutocompleteFieldMatchProps {
  placeholder: string;
  selectedField: DataViewFieldBase | undefined;
  selectedValue: string | undefined;
  indexPattern: DataViewBase | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  isRequired?: boolean;
  fieldInputWidth?: number;
  rowLabel?: string;
  autocompleteService: AutocompleteStart;
  onChange: (arg: string) => void;
  onError?: (arg: boolean) => void;
}

export const AutocompleteFieldMatchComponent: React.FC<AutocompleteFieldMatchProps> = ({
  placeholder,
  rowLabel,
  selectedField,
  selectedValue,
  indexPattern,
  isLoading,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  fieldInputWidth,
  onChange,
  onError,
  autocompleteService,
}): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoadingSuggestions, isSuggestingValues, suggestions] = useFieldValueAutocomplete({
    autocompleteService,
    fieldValue: selectedValue,
    indexPattern,
    operatorType: OperatorTypeEnum.MATCH,
    query: searchQuery,
    selectedField,
  });
  const getLabel = useCallback((option: string): string => option, []);
  const optionsMemo = useMemo((): string[] => {
    const valueAsStr = String(selectedValue);
    return selectedValue != null && selectedValue.trim() !== ''
      ? uniq([valueAsStr, ...suggestions])
      : suggestions;
  }, [suggestions, selectedValue]);
  const selectedOptionsMemo = useMemo((): string[] => {
    const valueAsStr = String(selectedValue);
    return selectedValue ? [valueAsStr] : [];
  }, [selectedValue]);

  const handleError = useCallback(
    (err: string | undefined): void => {
      setError((existingErr): string | undefined => {
        const oldErr = existingErr != null;
        const newErr = err != null;
        if (oldErr !== newErr && onError != null) {
          onError(newErr);
        }

        return err;
      });
    },
    [setError, onError]
  );

  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<string>({
        getLabel,
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const [newValue] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
      handleError(undefined);
      onChange(newValue ?? '');
    },
    [handleError, labels, onChange, optionsMemo]
  );

  const handleSearchChange = useCallback(
    (searchVal: string): void => {
      if (searchVal !== '' && selectedField != null) {
        const err = paramIsValid(searchVal, selectedField, isRequired, touched);
        handleError(err);

        setSearchQuery(searchVal);
      }
    },
    [handleError, isRequired, selectedField, touched]
  );

  const handleCreateOption = useCallback(
    (option: string): boolean | undefined => {
      const err = paramIsValid(option, selectedField, isRequired, touched);
      handleError(err);

      if (err != null) {
        // Explicitly reject the user's input
        return false;
      } else {
        onChange(option);
        return undefined;
      }
    },
    [isRequired, onChange, selectedField, touched, handleError]
  );

  const handleNonComboBoxInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const newValue = event.target.value;
      onChange(newValue);
    },
    [onChange]
  );

  const handleBooleanInputChange = useCallback(
    (newOption: string): void => {
      onChange(newOption);
    },
    [onChange]
  );

  const setIsTouchedValue = useCallback((): void => {
    setIsTouched(true);

    const err = paramIsValid(selectedValue, selectedField, isRequired, true);
    handleError(err);
  }, [setIsTouched, handleError, selectedValue, selectedField, isRequired]);

  const inputPlaceholder = useMemo((): string => {
    if (isLoading || isLoadingSuggestions) {
      return i18n.LOADING;
    } else if (selectedField == null) {
      return i18n.SELECT_FIELD_FIRST;
    } else {
      return placeholder;
    }
  }, [isLoading, selectedField, isLoadingSuggestions, placeholder]);

  const isLoadingState = useMemo(
    (): boolean => isLoading || isLoadingSuggestions,
    [isLoading, isLoadingSuggestions]
  );

  useEffect((): void => {
    setError(undefined);
    if (onError != null) {
      onError(false);
    }
  }, [selectedField, onError]);

  const defaultInput = useMemo((): JSX.Element => {
    return (
      <EuiFormRow
        label={rowLabel}
        error={error}
        isInvalid={selectedField != null && error != null}
        data-test-subj="valuesAutocompleteMatchLabel"
        fullWidth
      >
        <EuiComboBox
          placeholder={inputPlaceholder}
          isDisabled={isDisabled || !selectedField}
          isLoading={isLoadingState}
          isClearable={isClearable}
          options={comboOptions}
          selectedOptions={selectedComboOptions}
          onChange={handleValuesChange}
          singleSelection={SINGLE_SELECTION}
          onSearchChange={handleSearchChange}
          onCreateOption={handleCreateOption}
          isInvalid={selectedField != null && error != null}
          onBlur={setIsTouchedValue}
          sortMatchesBy="startsWith"
          data-test-subj="valuesAutocompleteMatch"
          style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
          fullWidth
          async
        />
      </EuiFormRow>
    );
  }, [
    comboOptions,
    error,
    fieldInputWidth,
    handleCreateOption,
    handleSearchChange,
    handleValuesChange,
    inputPlaceholder,
    isClearable,
    isDisabled,
    isLoadingState,
    rowLabel,
    selectedComboOptions,
    selectedField,
    setIsTouchedValue,
  ]);

  if (!isSuggestingValues && selectedField != null) {
    switch (selectedField.type) {
      case 'number':
        return (
          <EuiFormRow
            label={rowLabel}
            error={error}
            isInvalid={selectedField != null && error != null}
            data-test-subj="valuesAutocompleteMatchLabel"
            fullWidth
          >
            <EuiFieldNumber
              placeholder={inputPlaceholder}
              onBlur={setIsTouchedValue}
              value={
                typeof selectedValue === 'string' && selectedValue.trim().length > 0
                  ? parseFloat(selectedValue)
                  : selectedValue ?? ''
              }
              onChange={handleNonComboBoxInputChange}
              data-test-subj="valueAutocompleteFieldMatchNumber"
              style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
              fullWidth
            />
          </EuiFormRow>
        );
      case 'boolean':
        return (
          <EuiFormRow
            label={rowLabel}
            error={error}
            isInvalid={selectedField != null && error != null}
            data-test-subj="valuesAutocompleteMatchLabel"
            fullWidth
          >
            <EuiSuperSelect
              isLoading={isLoadingState}
              options={BOOLEAN_OPTIONS}
              valueOfSelected={selectedValue ?? 'true'}
              onChange={handleBooleanInputChange}
              data-test-subj="valuesAutocompleteMatchBoolean"
              style={fieldInputWidth ? { width: `${fieldInputWidth}px` } : {}}
              fullWidth
            />
          </EuiFormRow>
        );
      default:
        return defaultInput;
    }
  } else {
    return defaultInput;
  }
};

AutocompleteFieldMatchComponent.displayName = 'AutocompleteFieldMatch';
