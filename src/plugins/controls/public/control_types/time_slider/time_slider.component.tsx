/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiDualRange,
  EuiRangeProps,
  EuiDualRangeProps,
  EuiText,
  EuiFilterButton,
  EuiFilterGroup,
  EuiButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import moment from 'moment-timezone';
import { TimeRange, calcAutoIntervalNear } from '../../../../data/common';
import { ValidatedDualRange } from '../../../../kibana_react/public';
import './time_slider.component.scss';

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

export interface TimeSliderProps {
  range?: [number | undefined, number | undefined];
  value: [number | undefined, number | undefined];
  onChange: EuiDualRangeProps['onChange'];
}

const isValidRange = (maybeRange: TimeSliderProps['range']): maybeRange is [number, number] => {
  return maybeRange !== undefined && maybeRange[0] !== undefined && maybeRange[1] !== undefined;
};

export const TimeSlider: FC<TimeSliderProps> = (props) => {
  const { range, value } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  // If we don't have a range or we have is loading, show the loading state
  const hasRange = range !== undefined;

  // We have values if we have a range or value entry for both position
  const hasValues =
    (value[0] !== undefined || (hasRange && range[0] !== undefined)) &&
    (value[1] !== undefined || (hasRange && range[1] !== undefined));

  let valueText: JSX.Element | null = null;
  if (hasValues) {
    const lower = value[0] !== undefined ? value[0] : range![0];
    const upper = value[1] !== undefined ? value[1] : range![1];

    // has value and doesn't have a
    const hasLowerValueInRange =
      value[0] !== undefined &&
      (!isValidRange(range) || (value[0] >= range[0] && value[0] <= range[1]));
    // It's out of range if the upper value is above the upper range or below the lower range
    const hasUpperValueInRange =
      value[1] !== undefined &&
      (!isValidRange(range) || (value[1] <= range[1] && value[1] >= range[0]));

    valueText = (
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiText
            size="s"
            className={
              hasLowerValueInRange ? 'timeSlider_anchorText' : 'timeSlider_anchorText__default'
            }
          >
            {epochToKbnDateFormat(lower)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText className="timeSlider_anchorArrow"> → </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="s"
            className={
              hasUpperValueInRange ? 'timeSlider_anchorText' : 'timeSlider_anchorText__default'
            }
          >
            {epochToKbnDateFormat(upper)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const button = (
    <EuiFilterButton
      className="timeSlider_anchor"
      color="text"
      iconType={'empty'}
      iconSide="right"
      isLoading={!hasRange}
      onClick={togglePopover}
      isSelected={true}
    >
      {valueText}
    </EuiFilterButton>
  );

  return (
    //<EuiFilterGroup style={{ width: '100%', height: '100%' }}>
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      className="optionsList__popoverOverride"
      anchorClassName="optionsList__anchorOverride"
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      ownFocus
      repositionOnScroll
    >
      {isValidRange(range) ? (
        <TimeSliderComponentPopover range={range} value={value} onChange={props.onChange} />
      ) : (
        <TimeSliderComponentPopoverNoDocuments />
      )}
    </EuiPopover>
    //</EuiFilterGroup>
  );
};

const TimeSliderComponentPopoverNoDocuments: FC = () => {
  return <EuiText color="default">There were no documents found, so no range is available</EuiText>;
};

export const TimeSliderComponentPopover: FC<TimeSliderProps & { range: [number, number] }> = ({
  range,
  value,
  onChange,
}) => {
  const [lowerBound, upperBound] = range;
  let [lowerValue, upperValue] = value;

  if (lowerValue === undefined) {
    lowerValue = lowerBound;
  }

  if (upperValue === undefined) {
    upperValue = upperBound;
  }

  const ticks = useMemo(() => {
    const interval = getInterval(lowerBound, upperBound);
    return getTicks(lowerBound, upperBound, interval);
  }, [lowerBound, upperBound]);

  return (
    <>
      <EuiPopoverTitle paddingSize="s">
        {epochToKbnDateFormat(lowerValue)} - {epochToKbnDateFormat(upperValue)}
      </EuiPopoverTitle>
      <div className="rangeSlider__actions">
        <ValidatedDualRange
          id={'my-id'}
          max={upperBound}
          min={lowerBound}
          onChange={onChange}
          step={undefined}
          value={[lowerValue, upperValue]}
          fullWidth
          ticks={ticks}
          // levels={levels}
          showTicks
          disabled={false}
          errorMessage={''}
          allowEmptyRange
        />
      </div>
    </>
  );
};
