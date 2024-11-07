/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGenericComboBoxProps } from '.';

describe('get_generic_combo_box_props', () => {
  test('it returns empty arrays if "options" is empty array', () => {
    const result = getGenericComboBoxProps<string>({
      options: [],
      selectedOptions: ['option1'],
      getLabel: (t: string) => t,
    });

    expect(result).toEqual({ comboOptions: [], labels: [], selectedComboOptions: [] });
  });

  test('it returns formatted props if "options" array is not empty', () => {
    const result = getGenericComboBoxProps<string>({
      options: ['option1', 'option2', 'option3'],
      selectedOptions: [],
      getLabel: (t: string) => t,
    });

    expect(result).toEqual({
      comboOptions: [
        {
          label: 'option1',
        },
        {
          label: 'option2',
        },
        {
          label: 'option3',
        },
      ],
      labels: ['option1', 'option2', 'option3'],
      selectedComboOptions: [],
    });
  });

  test('it does not return "selectedOptions" items that do not appear in "options"', () => {
    const result = getGenericComboBoxProps<string>({
      options: ['option1', 'option2', 'option3'],
      selectedOptions: ['option4'],
      getLabel: (t: string) => t,
    });

    expect(result).toEqual({
      comboOptions: [
        {
          label: 'option1',
        },
        {
          label: 'option2',
        },
        {
          label: 'option3',
        },
      ],
      labels: ['option1', 'option2', 'option3'],
      selectedComboOptions: [],
    });
  });

  test('it returns "selectedOptions" items that do appear in "options"', () => {
    const result = getGenericComboBoxProps<string>({
      options: ['option1', 'option2', 'option3'],
      selectedOptions: ['option2'],
      getLabel: (t: string) => t,
    });

    expect(result).toEqual({
      comboOptions: [
        {
          label: 'option1',
        },
        {
          label: 'option2',
        },
        {
          label: 'option3',
        },
      ],
      labels: ['option1', 'option2', 'option3'],
      selectedComboOptions: [
        {
          label: 'option2',
        },
      ],
    });
  });

  test('it returns "disabledOptions" items that do appear in "options" as disabled', () => {
    const result = getGenericComboBoxProps<string>({
      options: ['option1', 'option2', 'option3'],
      selectedOptions: [],
      disabledOptions: ['option2'],
      getLabel: (t: string) => t,
    });

    expect(result).toEqual({
      comboOptions: [
        {
          label: 'option1',
          disabled: false,
        },
        {
          label: 'option2',
          disabled: true,
        },
        {
          label: 'option3',
          disabled: false,
        },
      ],
      labels: ['option1', 'option2', 'option3'],
      selectedComboOptions: [],
    });
  });
});
