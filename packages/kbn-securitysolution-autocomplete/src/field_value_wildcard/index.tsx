/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiFormRow, EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';
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

const SINGLE_SELECTION = { asPlainText: true };

type OS = 'linux' | 'macos' | 'windows';
interface AutocompleteFieldWildcardProps {
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
  os: OS;
}

/*
 * regex to match executable names
 * starts matching from the eol of the path
 * file names with a single or multiple spaces (for spaced names)
 * and hyphens and combinations of these that produce complex names
 * such as:
 * c:\home\lib\dmp.dmp
 * c:\home\lib\my-binary-app-+/ some/  x/ dmp.dmp
 * /home/lib/dmp.dmp
 * /home/lib/my-binary-app+-\ some\  x\ dmp.dmp
 */
const WIN_EXEC_PATH = /\\(\w+|\w*[\w+|-]+\/ +)+\w+[\w+|-]+\.*\w+$/i;
const UNIX_EXEC_PATH = /(\/|\w*[\w+|-]+\\ +)+\w+[\w+|-]+\.*\w*$/i;

export const warnOnWildcardInExecutableName = ({
  os,
  value = '',
}: {
  os: OS;
  value?: string;
}): string | undefined => {
  const textInput = value.trim();
  const isUnixValidPath = UNIX_EXEC_PATH.test(textInput);
  const isWindowsValidPath = WIN_EXEC_PATH.test(textInput);

  if (os === 'windows') {
    return textInput.length
      ? !isWindowsValidPath
        ? isUnixValidPath
          ? i18n.FILEPATH_WARNING
          : i18n.FILENAME_WILDCARD_WARNING
        : ''
      : undefined;
  }

  return textInput.length
    ? !isUnixValidPath
      ? isWindowsValidPath
        ? i18n.FILEPATH_WARNING
        : i18n.FILENAME_WILDCARD_WARNING
      : ''
    : undefined;
};

export const AutocompleteFieldWildcardComponent: React.FC<AutocompleteFieldWildcardProps> = ({
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
  onWarning,
  os,
  autocompleteService,
}): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const [isLoadingSuggestions, , suggestions] = useFieldValueAutocomplete({
    autocompleteService,
    fieldValue: selectedValue,
    indexPattern,
    operatorType: OperatorTypeEnum.WILDCARD,
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

  const handleWarning = useCallback(
    (warn: string | undefined): void => {
      setWarning((existingWarning): string | undefined => {
        const oldWarning = existingWarning != null;
        const newWarning = warn != null;
        if (oldWarning !== newWarning && onWarning != null) {
          onWarning(newWarning);
        }

        return warn;
      });
    },
    [setWarning, onWarning]
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
      handleWarning(undefined);
      onChange(newValue ?? '');
    },
    [handleError, handleWarning, labels, onChange, optionsMemo]
  );

  const handleSearchChange = useCallback(
    (searchVal: string): void => {
      if (searchVal !== '' && selectedField != null) {
        const err = paramIsValid(searchVal, selectedField, isRequired, touched);
        handleError(err);

        const warn = warnOnWildcardInExecutableName({ value: searchVal, os });
        handleWarning(warn);

        setSearchQuery(searchVal);
      }
    },
    [handleError, isRequired, selectedField, touched, os, handleWarning]
  );

  const handleCreateOption = useCallback(
    (option: string): boolean | undefined => {
      const err = paramIsValid(option, selectedField, isRequired, touched);
      handleError(err);
      const warn = warnOnWildcardInExecutableName({ value: option, os });
      handleWarning(warn);

      if (err != null) {
        // Explicitly reject the user's input
        return false;
      } else {
        onChange(option);
        return undefined;
      }
    },
    [isRequired, onChange, selectedField, touched, handleError, handleWarning, os]
  );

  const setIsTouchedValue = useCallback((): void => {
    setIsTouched(true);

    const err = paramIsValid(selectedValue, selectedField, isRequired, true);
    handleError(err);

    const warn = warnOnWildcardInExecutableName({ value: selectedValue, os });
    handleWarning(warn);
  }, [setIsTouched, handleError, selectedValue, selectedField, isRequired, handleWarning, os]);

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
    setWarning(undefined);
    if (onError != null) {
      onError(false);
    }
    if (onWarning != null) {
      onWarning(false);
    }
  }, [selectedField, onError, onWarning]);

  const defaultInput = useMemo((): JSX.Element => {
    return (
      <EuiFormRow
        label={rowLabel}
        error={error}
        helpText={warning}
        isInvalid={selectedField != null && error != null}
        data-test-subj="valuesAutocompleteWildcardLabel"
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
          data-test-subj="valuesAutocompleteWildcard"
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
    warning,
  ]);

  return defaultInput;
};

AutocompleteFieldWildcardComponent.displayName = 'AutocompleteFieldWildcard';
