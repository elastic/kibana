/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { TimeSlider as Component } from './time_slider.component';

interface TimeSliderProps {
  dateFormat: string;
  timezone: string;
}

export const TimeSlider: FC<TimeSliderProps> = ({ dateFormat, timezone }) => {
  const { min, max } = {} as {
    min?: number;
    max?: number;
  };

  return (
    <Component
      id={'foobar'}
      onChange={() => {}}
      value={[null, null]}
      range={[min, max]}
      dateFormat={dateFormat}
      timezone={timezone}
    />
  );
};
