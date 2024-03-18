/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiInputPopover } from '@elastic/eui';
import React, { FC } from 'react';

import { TimeSlice } from '../../../common/types';
import { useTimeSlider } from '../embeddable/time_slider_embeddable';
import { getRoundedTimeRangeBounds } from '../time_slider_selectors';
import { FROM_INDEX, TO_INDEX } from '../time_utils';
import { TimeSliderPopoverButton } from './time_slider_popover_button';
import { TimeSliderPopoverContent } from './time_slider_popover_content';

import './index.scss';

interface Props {
  formatDate: (epoch: number) => string;
  onChange: (value?: TimeSlice) => void;
}

export const TimeSlider: FC<Props> = (props: Props) => {
  const timeSlider = useTimeSlider();

  const stepSize = timeSlider.select((state) => {
    return state.componentState.stepSize;
  });
  const ticks = timeSlider.select((state) => {
    return state.componentState.ticks;
  });
  const timeRangeBounds = timeSlider.select(getRoundedTimeRangeBounds);
  const timeRangeMin = timeRangeBounds[FROM_INDEX];
  const timeRangeMax = timeRangeBounds[TO_INDEX];
  const value = timeSlider.select((state) => {
    return state.componentState.value;
  });
  const isOpen = timeSlider.select((state) => {
    return state.componentState.isOpen;
  });

  const from = value ? value[FROM_INDEX] : timeRangeMin;
  const to = value ? value[TO_INDEX] : timeRangeMax;

  return (
    <EuiInputPopover
      className="timeSlider__popoverOverride"
      panelClassName="timeSlider__panelOverride"
      input={
        <TimeSliderPopoverButton
          onClick={() => {
            timeSlider.dispatch.setIsOpen({ isOpen: !isOpen });
          }}
          formatDate={props.formatDate}
          from={from}
          to={to}
        />
      }
      isOpen={isOpen}
      closePopover={() => timeSlider.dispatch.setIsOpen({ isOpen: false })}
      panelPaddingSize="s"
    >
      <TimeSliderPopoverContent
        value={[from, to]}
        onChange={props.onChange}
        stepSize={stepSize}
        ticks={ticks}
        timeRangeMin={timeRangeMin}
        timeRangeMax={timeRangeMax}
      />
    </EuiInputPopover>
  );
};
