/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiSelect, EuiSelectProps } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for a {@link SelectInput} component.
 */
export interface SelectInputProps extends InputProps<'select'> {
  /** Specify the option labels to their values. */
  optionLabels: Record<string, string | number>;
  /** Specify the option values. */
  optionValues: Array<string | number>;
}

/**
 * Component for manipulating a `select` field.
 */
export const SelectInput = ({
  field,
  unsavedChange,
  onInputChange,
  optionLabels = {},
  optionValues: optionsProp,
  isSavingEnabled,
}: SelectInputProps) => {
  if (optionsProp.length === 0) {
    throw new Error('non-empty `optionValues` are required for `SelectInput`.');
  }

  const options = useMemo(
    () =>
      optionsProp?.map((option) => ({
        text: Object.hasOwn(optionLabels, option) ? optionLabels[option] : option,
        value: option,
      })),
    [optionsProp, optionLabels]
  );

  const onChange: EuiSelectProps['onChange'] = (event) => {
    const inputValue = event.target.value;
    onUpdate({ type: field.type, unsavedValue: inputValue });
  };

  const onUpdate = useUpdate({ onInputChange, field });

  const { id, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;
  const [value] = getFieldInputValue(field, unsavedChange);

  return (
    <EuiSelect
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={!isSavingEnabled}
      fullWidth
      {...{ onChange, options, value }}
    />
  );
};
