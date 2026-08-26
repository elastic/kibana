/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSelect, EuiSuperSelect } from '@elastic/eui';
import { useSerializableState } from './serializable_state';

const selectOptions = [
  { value: 'option_one', text: 'Option one' },
  { value: 'option_two', text: 'Option two' },
  { value: 'option_three', text: 'Option three' },
];

const superSelectOptions = [
  { value: 'minor', inputDisplay: 'Minor' },
  { value: 'moderate', inputDisplay: 'Moderate' },
  { value: 'critical', inputDisplay: 'Critical' },
];

export const SelectRegular = () => {
  const [value, setValue] = useSerializableState('value', 'option_one');
  return (
    <EuiSelect
      aria-label="Select an option"
      options={selectOptions}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

export const SelectCompressed = () => {
  const [value, setValue] = useSerializableState('value', 'option_one');
  return (
    <EuiSelect
      aria-label="Select an option"
      options={selectOptions}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      compressed
    />
  );
};

export const SelectDisabled = () => (
  <EuiSelect aria-label="Select an option" options={selectOptions} value="option_one" disabled />
);

export const SelectLoading = () => (
  <EuiSelect aria-label="Select an option" options={selectOptions} value="option_one" isLoading />
);

export const SuperSelectRegular = () => {
  const [value, setValue] = useSerializableState('value', 'minor');
  return (
    <EuiSuperSelect
      aria-label="Select severity"
      options={superSelectOptions}
      valueOfSelected={value}
      onChange={(v) => setValue(v)}
    />
  );
};

export const SuperSelectCompressed = () => {
  const [value, setValue] = useSerializableState('value', 'minor');
  return (
    <EuiSuperSelect
      aria-label="Select severity"
      options={superSelectOptions}
      valueOfSelected={value}
      onChange={(v) => setValue(v)}
      compressed
    />
  );
};

export const SuperSelectDisabled = () => (
  <EuiSuperSelect
    aria-label="Select severity"
    options={superSelectOptions}
    valueOfSelected="minor"
    onChange={() => {}}
    disabled
  />
);
