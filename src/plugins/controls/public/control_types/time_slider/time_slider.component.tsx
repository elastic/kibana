/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useMemo, useCallback } from 'react';
import { isNil } from 'lodash';
import {
  EuiText,
  EuiLoadingSpinner,
  EuiInputPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import moment from 'moment-timezone';
import { calcAutoIntervalNear } from '../../../../data/common';
import { ValidatedDualRange } from '../../../../kibana_react/public';
import { TimeSliderStrings } from './time_slider_strings';
import './time_slider.component.scss';

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

export interface TimeSliderProps {
  range?: [number | undefined, number | undefined];
  value: [number | null, number | null];
  onChange: (range: [number | null, number | null]) => void;
  dateFormat?: string;
  timezone?: string;
  fieldName: string;
  ignoreValidation?: boolean;
}

const isValidRange = (maybeRange: TimeSliderProps['range']): maybeRange is [number, number] => {
  return maybeRange !== undefined && !isNil(maybeRange[0]) && !isNil(maybeRange[1]);
};

const unselectedClass = 'timeSlider__anchorText--default';
const validClass = 'timeSlider__anchorText';
const invalidClass = 'timeSlider__anchorText--invalid';

export const TimeSlider: FC<TimeSliderProps> = (props) => {
  const defaultProps = {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    ignoreValidation: false,
    timezone: 'Browser',
    ...props,
  };
  const { range, value, timezone, dateFormat, fieldName, ignoreValidation } = defaultProps;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const getTimezone = useCallback(() => {
    const detectedTimezone = moment.tz.guess();

    return timezone === 'Browser' ? detectedTimezone : timezone;
  }, [timezone]);

  const epochToKbnDateFormat = useCallback(
    (epoch: number) => {
      const tz = getTimezone();
      return moment.tz(epoch, tz).format(dateFormat);
    },
    [dateFormat, getTimezone]
  );

  // If we don't have a range or we have is loading, show the loading state
  const hasRange = range !== undefined;

  // We have values if we have a range or value entry for both position
  const hasValues =
    (value[0] !== null || (hasRange && range[0] !== undefined)) &&
    (value[1] !== null || (hasRange && range[1] !== undefined));

  let valueText: JSX.Element | null = null;
  if (hasValues) {
    let lower = value[0] !== null ? value[0] : range![0]!;
    let upper = value[1] !== null ? value[1] : range![1]!;

    if (value[0] !== null && lower > upper) {
      upper = lower;
    } else if (value[1] !== null && lower > upper) {
      lower = upper;
    }

    const hasLowerValueInRange =
      value[0] !== null && isValidRange(range) && value[0] >= range[0] && value[0] <= range[1];
    // It's out of range if the upper value is above the upper range or below the lower range
    const hasUpperValueInRange =
      value[1] !== null && isValidRange(range) && value[1] <= range[1] && value[1] >= range[0];

    let lowClass = unselectedClass;
    let highClass = unselectedClass;
    if (value[0] !== null && (hasLowerValueInRange || ignoreValidation)) {
      lowClass = validClass;
    } else if (value[0] !== null) {
      lowClass = invalidClass;
    }

    if (value[1] !== null && (hasUpperValueInRange || ignoreValidation)) {
      highClass = validClass;
    } else if (value[1] !== null) {
      highClass = invalidClass;
    }

    // if no value then anchorText default
    // if hasLowerValueInRange || skipValidation then anchor text
    // else strikethrough

    valueText = (
      <EuiText className="eui-textTruncate" size="s">
        <span className={lowClass}>{epochToKbnDateFormat(lower)}</span>
        &nbsp;&nbsp;→&nbsp;&nbsp;
        <span className={highClass}>{epochToKbnDateFormat(upper)}</span>
      </EuiText>
    );
  }

  const button = (
    <button className="timeSlider__anchor eui-textTruncate" color="text" onClick={togglePopover}>
      {valueText}
      {!hasRange ? (
        <div className="timeSliderAnchor__spinner">
          <EuiLoadingSpinner />
        </div>
      ) : undefined}
    </button>
  );

  return (
    <EuiInputPopover
      input={button}
      isOpen={isPopoverOpen}
      className="timeSlider__popoverOverride"
      anchorClassName="timeSlider__anchorOverride"
      panelClassName="timeSlider__panelOverride"
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      disableFocusTrap
      attachToAnchor={false}
    >
      {isValidRange(range) ? (
        <TimeSliderComponentPopover
          range={range}
          value={value}
          onChange={props.onChange}
          getTimezone={getTimezone}
          epochToKbnDateFormat={epochToKbnDateFormat}
          fieldName={fieldName}
        />
      ) : (
        <TimeSliderComponentPopoverNoDocuments />
      )}
    </EuiInputPopover>
  );
};

const TimeSliderComponentPopoverNoDocuments: FC = () => {
  return <EuiText size="s">{TimeSliderStrings.noDocumentsPopover.getLabel()}</EuiText>;
};

export const TimeSliderComponentPopover: FC<
  TimeSliderProps & {
    range: [number, number];
    getTimezone: () => string;
    epochToKbnDateFormat: (epoch: number) => string;
  }
> = ({ range, value, onChange, getTimezone, epochToKbnDateFormat, fieldName }) => {
  const [lowerBound, upperBound] = range;
  let [lowerValue, upperValue] = value;

  if (lowerValue === null) {
    lowerValue = lowerBound;
  }

  if (upperValue === null) {
    upperValue = upperBound;
  }

  const fullRange = useMemo(
    () => [Math.min(lowerValue!, lowerBound), Math.max(upperValue!, upperBound)],
    [lowerValue, lowerBound, upperValue, upperBound]
  );

  const getTicks = useCallback(
    (min: number, max: number, interval: number): EuiRangeTick[] => {
      const format = getScaledDateFormat(interval);
      const tz = getTimezone();

      let tick = Math.ceil(min / interval) * interval;
      const ticks: EuiRangeTick[] = [];
      while (tick < max) {
        ticks.push({
          value: tick,
          label: moment.tz(tick, tz).format(format),
        });
        tick += interval;
      }

      return ticks;
    },
    [getTimezone]
  );

  const ticks = useMemo(() => {
    const interval = getInterval(fullRange[0], fullRange[1]);
    return getTicks(fullRange[0], fullRange[1], interval);
  }, [fullRange, getTicks]);

  const onChangeHandler = useCallback(
    ([_min, _max]: [number | string, number | string]) => {
      // If a value is undefined and the number that is given here matches the range bounds
      // then we will ignore it, becuase they probably didn't actually select that value
      const report: [number | null, number | null] = [null, null];

      let min: number;
      let max: number;
      if (typeof _min === 'string') {
        min = parseFloat(_min);
        min = isNaN(min) ? range[0] : min;
      } else {
        min = _min;
      }

      if (typeof _max === 'string') {
        max = parseFloat(_max);
        max = isNaN(max) ? range[0] : max;
      } else {
        max = _max;
      }

      if (value[0] !== null || min !== range[0]) {
        report[0] = min;
      }
      if (value[1] !== null || max !== range[1]) {
        report[1] = max;
      }

      onChange(report);
    },
    [onChange, value, range]
  );

  const levels = [{ min: range[0], max: range[1], color: 'success' }];

  return (
    <>
      <EuiPopoverTitle paddingSize="s">{fieldName}</EuiPopoverTitle>
      <EuiText textAlign="center" size="s">
        {epochToKbnDateFormat(lowerValue)} - {epochToKbnDateFormat(upperValue)}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <ValidatedDualRange
            id={`range${fieldName}`}
            max={fullRange[1]}
            min={fullRange[0]}
            onChange={onChangeHandler}
            step={undefined}
            value={[lowerValue, upperValue]}
            fullWidth
            ticks={ticks}
            levels={levels}
            showTicks
            disabled={false}
            allowEmptyRange
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TimeSliderStrings.resetButton.getLabel()}>
            <EuiButtonIcon
              iconType="eraser"
              color="danger"
              onClick={() => onChange([null, null])}
              aria-label={TimeSliderStrings.resetButton.getLabel()}
              data-test-subj="timeSlider__clearRangeButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
