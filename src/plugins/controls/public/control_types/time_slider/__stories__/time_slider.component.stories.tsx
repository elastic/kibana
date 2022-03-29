/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useCallback, useState } from 'react';
import moment from 'moment';
import { EuiFormControlLayout } from '@elastic/eui';

import { TimeSliderProps, TimeSlider } from '../time_slider.component';

export default {
  title: 'Time Slider',
  description: '',
};

const TimeSliderWrapper: FC<Omit<TimeSliderProps, 'onChange' | 'fieldName'>> = (props) => {
  const [value, setValue] = useState(props.value);
  const onChange = useCallback(
    (newValue: [number | null, number | null]) => {
      const lowValue = newValue[0];
      const highValue = newValue[1];

      setValue([lowValue, highValue]);
    },
    [setValue]
  );

  return (
    <div style={{ width: '600px' }}>
      <EuiFormControlLayout style={{ width: '100%' }}>
        <TimeSlider {...props} value={value} fieldName={'Field Name'} onChange={onChange} />
      </EuiFormControlLayout>
    </div>
  );
};

const undefinedValue: [null, null] = [null, null];
const undefinedRange: [undefined, undefined] = [undefined, undefined];

export const TimeSliderNoValuesOrRange = () => {
  // If range is undefined, that should be inndicate that we are loading the range
  return <TimeSliderWrapper value={undefinedValue} />;
};

export const TimeSliderUndefinedRangeNoValue = () => {
  // If a range is [undefined, undefined] then it was loaded, but no values were found.
  return <TimeSliderWrapper range={undefinedRange} value={undefinedValue} />;
};

export const TimeSliderUndefinedRangeWithValue = () => {
  const lastWeek = moment().subtract(7, 'days');
  const now = moment();

  return (
    <TimeSliderWrapper range={undefinedRange} value={[lastWeek.unix() * 1000, now.unix() * 1000]} />
  );
};

export const TimeSliderWithRangeAndNoValue = () => {
  const lastWeek = moment().subtract(7, 'days');
  const now = moment();

  return (
    <TimeSliderWrapper range={[lastWeek.unix() * 1000, now.unix() * 1000]} value={undefinedValue} />
  );
};

export const TimeSliderWithRangeAndLowerValue = () => {
  const lastWeek = moment().subtract(7, 'days');
  const now = moment();

  const threeDays = moment().subtract(3, 'days');

  return (
    <TimeSliderWrapper
      range={[lastWeek.unix() * 1000, now.unix() * 1000]}
      value={[threeDays.unix() * 1000, null]}
    />
  );
};

export const TimeSliderWithRangeAndUpperValue = () => {
  const lastWeek = moment().subtract(7, 'days');
  const now = moment();

  const threeDays = moment().subtract(3, 'days');

  return (
    <TimeSliderWrapper
      range={[lastWeek.unix() * 1000, now.unix() * 1000]}
      value={[null, threeDays.unix() * 1000]}
    />
  );
};

export const TimeSliderWithLowRangeOverlap = () => {
  const lastWeek = moment().subtract(7, 'days');
  const now = moment();

  const threeDays = moment().subtract(3, 'days');
  const twoDays = moment().subtract(2, 'days');

  return (
    <TimeSliderWrapper
      range={[threeDays.unix() * 1000, now.unix() * 1000]}
      value={[lastWeek.unix() * 1000, twoDays.unix() * 1000]}
    />
  );
};

export const TimeSliderWithRangeLowerThanValue = () => {
  const twoWeeksAgo = moment().subtract(14, 'days');
  const lastWeek = moment().subtract(7, 'days');

  const now = moment();
  const threeDays = moment().subtract(3, 'days');

  return (
    <TimeSliderWrapper
      range={[twoWeeksAgo.unix() * 1000, lastWeek.unix() * 1000]}
      value={[threeDays.unix() * 1000, now.unix() * 1000]}
    />
  );
};

export const TimeSliderWithRangeHigherThanValue = () => {
  const twoWeeksAgo = moment().subtract(14, 'days');
  const lastWeek = moment().subtract(7, 'days');

  const now = moment();
  const threeDays = moment().subtract(3, 'days');

  return (
    <TimeSliderWrapper
      value={[twoWeeksAgo.unix() * 1000, lastWeek.unix() * 1000]}
      range={[threeDays.unix() * 1000, now.unix() * 1000]}
    />
  );
};

export const PartialValueLowerThanRange = () => {
  // Selected value is March 8 -> March 9
  // Range is March 11 -> 25
  const eightDaysAgo = moment().subtract(8, 'days');

  const lastWeek = moment().subtract(7, 'days');
  const today = moment();

  return (
    <TimeSliderWrapper
      value={[null, eightDaysAgo.unix() * 1000]}
      range={[lastWeek.unix() * 1000, today.unix() * 1000]}
    />
  );
};

export const PartialValueHigherThanRange = () => {
  // Selected value is March 8 -> March 9
  // Range is March 11 -> 25
  const eightDaysAgo = moment().subtract(8, 'days');

  const lastWeek = moment().subtract(7, 'days');
  const today = moment();

  return (
    <TimeSliderWrapper
      range={[eightDaysAgo.unix() * 1000, lastWeek.unix() * 1000]}
      value={[today.unix() * 1000, null]}
    />
  );
};
