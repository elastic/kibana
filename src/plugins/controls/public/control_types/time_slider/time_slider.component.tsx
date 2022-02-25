/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useMemo, useCallback } from 'react';
import {
  EuiDualRange,
  EuiRangeProps,
  EuiDualRangeProps,
  EuiText,
  EuiFilterButton,
  EuiFilterGroup,
  EuiButton,
  EuiPopover,
} from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import moment from 'moment-timezone';
import { TimeRange, calcAutoIntervalNear } from '../../../../data/common';

function getTimezone() {
  const detectedTimezone = moment.tz.guess();
  return detectedTimezone;
  //const dateFormatTZ = getUiSettings().get('dateFormat:tz', 'Browser');

  //return dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

function getScaledDateFormat(interval: number): string {
  if (interval >= moment.duration(1, 'y').asMilliseconds()) {
    return 'YYYY';
  }

  if (interval >= moment.duration(1, 'd').asMilliseconds()) {
    return 'MMM D';
  }

  if (interval >= moment.duration(6, 'h').asMilliseconds()) {
    return 'Do HH';
  }

  if (interval >= moment.duration(1, 'h').asMilliseconds()) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 'm').asMilliseconds()) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 's').asMilliseconds()) {
    return 'mm:ss';
  }

  return 'ss.SSS';
}

export function getInterval(min: number, max: number, steps = 6): number {
  const duration = max - min;
  let interval = calcAutoIntervalNear(steps, duration).asMilliseconds();
  // Sometimes auto interval is not quite right and returns 2X or 3X requested ticks
  // Adjust the interval to get closer to the requested number of ticks
  const actualSteps = duration / interval;
  if (actualSteps > steps * 1.5) {
    const factor = Math.round(actualSteps / steps);
    interval *= factor;
  } else if (actualSteps < 5) {
    interval *= 0.5;
  }
  return interval;
}

export function getTicks(min: number, max: number, interval: number): EuiRangeTick[] {
  const format = getScaledDateFormat(interval);
  const timezone = getTimezone();

  let tick = Math.ceil(min / interval) * interval;
  const ticks: EuiRangeTick[] = [];
  while (tick < max) {
    ticks.push({
      value: tick,
      label: moment.tz(tick, timezone).format(format),
    });
    tick += interval;
  }

  return ticks;
}

export function epochToKbnDateFormat(epoch: number): string {
  const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS'; //getUiSettings().get('dateFormat', 'MMM D, YYYY @ HH:mm:ss.SSS');
  const timezone = getTimezone();
  return moment.tz(epoch, timezone).format(dateFormat);
}

export const TimeSlider: FC<TimeSliderProps> = (props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const button = (
    <EuiFilterButton
      isLoading={false}
      data-test-subj={``}
      onClick={togglePopover}
      isSelected={true}
    >
      Some Text
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup style={{ width: '100%', height: '100%' }}>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        className="optionsList__popoverOverride"
        anchorClassName="optionsList__anchorOverride"
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        ownFocus
        repositionOnScroll
      >
        <TimeSliderComponent {...props} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export interface TimeSliderProps {
  range: [number, number];
  value: [number, number];
  onChange: EuiDualRangeProps['onChange'];
}

export const TimeSliderComponent: FC<TimeSliderProps> = ({ range, value, onChange }) => {
  const [lowerBound, upperBound] = range;
  const [lowerValue, upperValue] = value;

  const ticks = useMemo(() => {
    const interval = getInterval(lowerBound, upperBound);
    return getTicks(lowerBound, upperBound, interval);
  }, [lowerBound, upperBound]);

  // We want to have some sort of delay in actually pushing up a change so we don't continually push changes
  // But for now we'll just report everything up.  Maybe a layer up is where that should be happening anyways
  return (
    <div>
      <div>
        <EuiText textAlign="center">
          {epochToKbnDateFormat(lowerValue)} - {epochToKbnDateFormat(upperValue)}
        </EuiText>
      </div>

      <EuiDualRange
        min={lowerBound}
        max={upperBound}
        value={value}
        fullWidth={true}
        onChange={onChange}
        showTicks={true}
        ticks={ticks}
      />
    </div>
  );
};
