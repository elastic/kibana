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

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { RangeControl, ceilWithPrecision, floorWithPrecision } from './range_control';
import { RangeControl as RangeControlClass } from '../../control/range_control_factory';

jest.mock('ui/new_platform');

const control: RangeControlClass = {
  id: 'mock-range-control',
  isEnabled: () => {
    return true;
  },
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  type: 'range',
  label: 'range control',
  value: { min: 0, max: 0 },
  min: 0,
  max: 100,
  hasValue: () => {
    return false;
  },
} as RangeControlClass;

test('renders RangeControl', () => {
  const component = shallowWithIntl(
    <RangeControl control={control} controlIndex={0} stageFilter={() => {}} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('disabled', () => {
  const disabledRangeControl: RangeControlClass = {
    id: 'mock-range-control',
    isEnabled: () => {
      return false;
    },
    options: {
      decimalPlaces: 0,
      step: 1,
    },
    type: 'range',
    label: 'range control',
    disabledReason: 'control is disabled to test rendering when disabled',
    hasValue: () => {
      return false;
    },
  } as RangeControlClass;
  const component = shallowWithIntl(
    <RangeControl control={disabledRangeControl} controlIndex={0} stageFilter={() => {}} />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('ceilWithPrecision', () => {
  expect(ceilWithPrecision(999.133, 0)).toBe(1000);
  expect(ceilWithPrecision(999.133, 2)).toBe(999.14);
});

test('floorWithPrecision', () => {
  expect(floorWithPrecision(100.777, 0)).toBe(100);
  expect(floorWithPrecision(100.777, 2)).toBe(100.77);
});
