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
// import { AutocompleteStart } from '../../../../../../../src/plugins/unified_search/public';
type AutocompleteStart = any;

import * as i18n from '../translations';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import {
  getGenericComboBoxProps,
  GetGenericComboBoxPropsReturn,
} from '../get_generic_combo_box_props';
import { paramIsValid } from '../param_is_valid';
import { paramContainsSpace } from '../param_contains_space';

const BOOLEAN_OPTIONS = [
  { inputDisplay: 'true', value: 'true' },
  { inputDisplay: 'false', value: 'false' },
];

const SINGLE_SELECTION = { asPlainText: true };

type Warning = string | React.ReactNode;

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
  onWarning?: (arg: boolean) => void;
  warning?: Warning;
  'aria-label'?: string;
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
  autocompleteService,
  onChange,
  onError,
  onWarning,
  warning,
  'aria-label': ariaLabel,
}): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showSpacesWarning, setShowSpacesWarning] = useState<boolean>(false);
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

  const handleSpacesWarning = useCallback(
    (param: string | undefined) => {
      if (!param) return setShowSpacesWarning(false);
      setShowSpacesWarning(!!paramContainsSpace(param));
    },
    [setShowSpacesWarning]
  );

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

  const handleWarning = useCallback(
    (warn: Warning | undefined): void => {
      if (onWarning) {
        onWarning(warn !== undefined);
      }
    },
    [onWarning]
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

      handleSpacesWarning(newValue);
      handleError(undefined);
      handleWarning(undefined);
      onChange(newValue ?? '');
    },
    [handleError, handleWarning, handleSpacesWarning, labels, onChange, optionsMemo]
  );

  const handleSearchChange = useCallback(
    (searchVal: string): void => {
      if (searchVal !== '' && selectedField != null) {
        const err = paramIsValid(searchVal, selectedField, isRequired, touched);
        handleError(err);
        handleWarning(warning);

        if (!err) handleSpacesWarning(searchVal);
        setSearchQuery(searchVal);
      }
    },
    [handleError, handleSpacesWarning, isRequired, selectedField, touched, handleWarning, warning]
  );

  const handleCreateOption = useCallback(
    (option: string): boolean | undefined => {
      const err = paramIsValid(option, selectedField, isRequired, touched);
      handleError(err);
      handleWarning(warning);

      if (err != null) {
        // Explicitly reject the user's input
        setShowSpacesWarning(false);
        return false;
      }

      handleSpacesWarning(option);
      onChange(option);
      return undefined;
    },
    [
      isRequired,
      onChange,
      selectedField,
      touched,
      handleError,
      handleSpacesWarning,
      handleWarning,
      warning,
    ]
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
    handleWarning(warning);
  }, [setIsTouched, handleError, selectedValue, selectedField, isRequired, warning, handleWarning]);

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
    if (onError != null) onError(false);

    handleSpacesWarning(selectedValue);
    // Looks like selectedField return new object every time when we for example add "and" entry
    // that's why we need to check for name and type here
    // Probably we should use some kind of memoization on parent components for entries
  }, [selectedField?.name, selectedField?.type, selectedValue, handleSpacesWarning, onError]);

  const defaultInput = useMemo((): JSX.Element => {
    return (
      <EuiFormRow
        label={rowLabel}
        error={error}
        isInvalid={selectedField != null && error != null}
        data-test-subj="valuesAutocompleteMatchLabel"
        fullWidth
        helpText={warning || (showSpacesWarning && i18n.FIELD_SPACE_WARNING)}
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
          aria-label={ariaLabel}
          fullWidth
          async
        />
      </EuiFormRow>
    );
  }, [
    rowLabel,
    error,
    selectedField,
    showSpacesWarning,
    inputPlaceholder,
    isDisabled,
    isLoadingState,
    isClearable,
    comboOptions,
    selectedComboOptions,
    handleValuesChange,
    handleSearchChange,
    handleCreateOption,
    setIsTouchedValue,
    warning,
    fieldInputWidth,
    ariaLabel,
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
              aria-label={ariaLabel}
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
              aria-label={ariaLabel}
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
