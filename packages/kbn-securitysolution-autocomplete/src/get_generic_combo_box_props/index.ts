/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';

export interface GetGenericComboBoxPropsReturn {
  comboOptions: EuiComboBoxOptionOption[];
  labels: string[];
  selectedComboOptions: EuiComboBoxOptionOption[];
}

/**
 * Determines the options, selected values and option labels for EUI combo box
 * @param options options user can select from
 * @param selectedOptions user selection if any
 * @param getLabel helper function to know which property to use for labels
 */
export const getGenericComboBoxProps = <T>({
  getLabel,
  options,
  selectedOptions,
}: {
  getLabel: (value: T) => string;
  options: T[];
  selectedOptions: T[];
}): GetGenericComboBoxPropsReturn => {
  const newLabels = options.map(getLabel);
  const newComboOptions: EuiComboBoxOptionOption[] = newLabels.map((label) => ({ label }));
  const newSelectedComboOptions = selectedOptions
    .map(getLabel)
    .filter((option) => {
      return newLabels.indexOf(option) !== -1;
    })
    .map((option) => {
      return newComboOptions[newLabels.indexOf(option)];
    });

  return {
    comboOptions: newComboOptions,
    labels: newLabels,
    selectedComboOptions: newSelectedComboOptions,
  };
};
