/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import React from 'react';

export interface GenericComboBoxProps<T> {
  options: T[];
  selectedOptions: T[];
  getLabel: (value: T) => string;
  onChange: (values: T[]) => void;
  [propName: string]: any;
}

/**
 * A generic combo box. Instead of accepting a set of options that contain a `label`, it accepts
 * any type of object. It also accepts a `getLabel` function that each object will be sent through
 * to get the label to be passed to the combo box. The `onChange` will trigger with the actual
 * selected objects, rather than an option object.
 */
export function GenericComboBox<T>(props: GenericComboBoxProps<T>) {
  const { options, selectedOptions, getLabel, onChange, ...otherProps } = props;

  const labels = options.map(getLabel);
  const euiOptions: EuiComboBoxOptionOption[] = labels.map((label) => ({ label }));
  const selectedEuiOptions = selectedOptions
    .filter((option) => {
      return options.indexOf(option) !== -1;
    })
    .map((option) => {
      return euiOptions[options.indexOf(option)];
    });

  const onComboBoxChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => {
      return options[labels.indexOf(label)];
    });
    onChange(newValues);
  };

  return (
    <EuiComboBox
      options={euiOptions}
      selectedOptions={selectedEuiOptions}
      onChange={onComboBoxChange}
      sortMatchesBy="startsWith"
      {...otherProps}
    />
  );
}
