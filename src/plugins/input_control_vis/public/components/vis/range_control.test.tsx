/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { RangeControl, ceilWithPrecision, floorWithPrecision } from './range_control';
import { RangeControl as RangeControlClass } from '../../control/range_control_factory';

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
  expect(component).toMatchSnapshot();
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
  expect(component).toMatchSnapshot();
});

test('ceilWithPrecision', () => {
  expect(ceilWithPrecision(999.133, 0)).toBe(1000);
  expect(ceilWithPrecision(999.133, 2)).toBe(999.14);
});

test('floorWithPrecision', () => {
  expect(floorWithPrecision(100.777, 0)).toBe(100);
  expect(floorWithPrecision(100.777, 2)).toBe(100.77);
});
