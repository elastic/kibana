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

const TimeSliderWrapper: FC<Omit<TimeSliderProps, 'onChange'>> = (props) => {
  const [value, setValue] = useState(props.value);
  const onChange = useCallback(
    (newValue: [number | string, number | string]) => {
      const lowValue = typeof newValue[0] === 'string' ? parseFloat(newValue[0]) : newValue[0];
      const highValue = typeof newValue[1] === 'string' ? parseFloat(newValue[1]) : newValue[1];

      setValue([lowValue, highValue]);
    },
    [setValue]
  );

  return (
    <div style={{ width: '600px' }}>
      <EuiFormControlLayout style={{ 'max-width': '100%' }}>
        <TimeSlider {...props} value={value} onChange={onChange} />
      </EuiFormControlLayout>
    </div>
  );
};

const undefinedValue: [undefined, undefined] = [undefined, undefined];

export const TimeSliderNoValuesOrRange = () => {
  // If range is undefined, that should be inndicate that we are loading the range
  return <TimeSliderWrapper value={undefinedValue} />;
};

export const TimeSliderUndefinedRangeNoValue = () => {
  // If a range is [undefined, undefined] then it was loaded, but no values were found.
  return <TimeSliderWrapper range={undefinedValue} value={undefinedValue} />;
};

export const TimeSliderUndefinedRangeWithValue = () => {
  const lastWeek = moment().subtract(7, 'days');
  const now = moment();

  return (
    <TimeSliderWrapper range={undefinedValue} value={[lastWeek.unix() * 1000, now.unix() * 1000]} />
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
      value={[threeDays.unix() * 1000, undefined]}
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
      value={[undefined, threeDays.unix() * 1000]}
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
