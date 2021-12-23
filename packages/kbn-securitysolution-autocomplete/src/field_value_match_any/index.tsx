/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { uniq } from 'lodash';
import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/100715
// import { AutocompleteStart } from '../../../../../../../src/plugins/data/public';
type AutocompleteStart = any;

import * as i18n from '../translations';
import {
  getGenericComboBoxProps,
  GetGenericComboBoxPropsReturn,
} from '../get_generic_combo_box_props';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import { paramIsValid } from '../param_is_valid';

interface AutocompleteFieldMatchAnyProps {
  placeholder: string;
  selectedField: DataViewFieldBase | undefined;
  selectedValue: string[];
  indexPattern: DataViewBase | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  isRequired?: boolean;
  rowLabel?: string;
  autocompleteService: AutocompleteStart;
  onChange: (arg: string[]) => void;
  onError?: (arg: boolean) => void;
}

export const AutocompleteFieldMatchAnyComponent: React.FC<AutocompleteFieldMatchAnyProps> = ({
  placeholder,
  rowLabel,
  selectedField,
  selectedValue,
  indexPattern,
  isLoading,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
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
    operatorType: OperatorTypeEnum.MATCH_ANY,
    query: searchQuery,
    selectedField,
  });
  const getLabel = useCallback((option: string): string => option, []);
  const optionsMemo = useMemo(
    (): string[] => (selectedValue ? uniq([...selectedValue, ...suggestions]) : suggestions),
    [suggestions, selectedValue]
  );
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<string>({
        getLabel,
        options: optionsMemo,
        selectedOptions: selectedValue,
      }),
    [optionsMemo, selectedValue, getLabel]
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

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const newValues: string[] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
      handleError(undefined);
      onChange(newValues);
    },
    [handleError, labels, onChange, optionsMemo]
  );

  const handleSearchChange = useCallback(
    (searchVal: string) => {
      if (searchVal === '') {
        handleError(undefined);
      }

      if (searchVal !== '' && selectedField != null) {
        const err = paramIsValid(searchVal, selectedField, isRequired, touched);
        handleError(err);

        setSearchQuery(searchVal);
      }
    },
    [handleError, isRequired, selectedField, touched]
  );

  const handleCreateOption = useCallback(
    (option: string): boolean => {
      const err = paramIsValid(option, selectedField, isRequired, touched);
      handleError(err);

      if (err != null) {
        // Explicitly reject the user's input
        return false;
      } else {
        onChange([...(selectedValue || []), option]);
        return true;
      }
    },
    [handleError, isRequired, onChange, selectedField, selectedValue, touched]
  );

  const setIsTouchedValue = useCallback((): void => {
    handleError(selectedComboOptions.length === 0 ? i18n.FIELD_REQUIRED_ERR : undefined);
    setIsTouched(true);
  }, [setIsTouched, handleError, selectedComboOptions]);

  const inputPlaceholder = useMemo(
    (): string => (isLoading || isLoadingSuggestions ? i18n.LOADING : placeholder),
    [isLoading, isLoadingSuggestions, placeholder]
  );

  const isLoadingState = useMemo(
    (): boolean => isLoading || isLoadingSuggestions,
    [isLoading, isLoadingSuggestions]
  );

  const defaultInput = useMemo((): JSX.Element => {
    return (
      <EuiFormRow
        label={rowLabel}
        error={error}
        isInvalid={selectedField != null && error != null}
        fullWidth
      >
        <EuiComboBox
          placeholder={inputPlaceholder}
          isLoading={isLoadingState}
          isClearable={isClearable}
          isDisabled={isDisabled}
          options={comboOptions}
          selectedOptions={selectedComboOptions}
          onChange={handleValuesChange}
          onSearchChange={handleSearchChange}
          onCreateOption={handleCreateOption}
          isInvalid={selectedField != null && error != null}
          onBlur={setIsTouchedValue}
          data-test-subj="valuesAutocompleteMatchAny"
          fullWidth
          async
        />
      </EuiFormRow>
    );
  }, [
    comboOptions,
    error,
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
            fullWidth
          >
            <EuiComboBox
              noSuggestions
              placeholder={inputPlaceholder}
              isLoading={isLoadingState}
              isClearable={isClearable}
              isDisabled={isDisabled}
              selectedOptions={selectedComboOptions}
              onChange={handleValuesChange}
              onSearchChange={handleSearchChange}
              onCreateOption={handleCreateOption}
              isInvalid={selectedField != null && error != null}
              onFocus={setIsTouchedValue}
              data-test-subj="valuesAutocompleteMatchAnyNumber"
              fullWidth
            />
          </EuiFormRow>
        );
      default:
        return defaultInput;
    }
  }

  return defaultInput;
};

AutocompleteFieldMatchAnyComponent.displayName = 'AutocompleteFieldMatchAny';
