/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { OperatorOption } from '@kbn/securitysolution-list-utils';
import { DataViewFieldBase } from '@kbn/es-query';

import { getOperators } from '../get_operators';
import {
  getGenericComboBoxProps,
  GetGenericComboBoxPropsReturn,
} from '../get_generic_combo_box_props';

const AS_PLAIN_TEXT = { asPlainText: true };

interface OperatorState {
  isClearable: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  onChange: (arg: OperatorOption[]) => void;
  operator: OperatorOption;
  operatorInputWidth?: number;
  operatorOptions?: OperatorOption[];
  placeholder: string;
  selectedField: DataViewFieldBase | undefined;
}

export const OperatorComponent: React.FC<OperatorState> = ({
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  onChange,
  operator,
  operatorOptions,
  operatorInputWidth = 150,
  placeholder,
  selectedField,
}): JSX.Element => {
  const getLabel = useCallback(({ message }): string => message, []);
  const optionsMemo = useMemo(
    (): OperatorOption[] =>
      operatorOptions != null && operatorOptions.length > 0
        ? operatorOptions
        : getOperators(selectedField),
    [operatorOptions, selectedField]
  );
  const selectedOptionsMemo = useMemo(
    (): OperatorOption[] => (operator ? [operator] : []),
    [operator]
  );
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    (): GetGenericComboBoxPropsReturn =>
      getGenericComboBoxProps<OperatorOption>({
        getLabel,
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const newValues: OperatorOption[] = newOptions.map(
        ({ label }) => optionsMemo[labels.indexOf(label)]
      );
      onChange(newValues);
    },
    [labels, onChange, optionsMemo]
  );

  const inputWidth = useMemo(() => {
    return { width: `${operatorInputWidth}px` };
  }, [operatorInputWidth]);

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={isClearable}
      singleSelection={AS_PLAIN_TEXT}
      data-test-subj="operatorAutocompleteComboBox"
      style={inputWidth}
    />
  );
};

OperatorComponent.displayName = 'Operator';
