/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useCallback, useState } from 'react';
import { ControlGroupStoryComponent } from '../../../__stories__/controls.stories';

import { TimeSliderComponent, TimeSliderProps, TimeSlider } from '../time_slider.component';

export default {
  title: 'Time Slider',
  description: '',
};

const TimeSliderWrapper: FC<Omit<TimeSliderProps, 'onChange'>> = (props) => {
  const [value, setValue] = useState([props.range[0], props.range[1]]);
  const onChange = useCallback(
    (newValue: [number | string, number | string]) => {
      const lowValue = typeof newValue[0] === 'string' ? parseFloat(newValue[0]) : newValue[0];
      const highValue = typeof newValue[1] === 'string' ? parseFloat(newValue[1]) : newValue[1];

      setValue([lowValue, highValue]);
    },
    [setValue]
  );

  return <TimeSlider {...props} onChange={onChange} value={value} />;
};

export const TimeSliderStory = () => {
  return <TimeSliderWrapper range={[1643985198009, 1644589998009]} />;
};
