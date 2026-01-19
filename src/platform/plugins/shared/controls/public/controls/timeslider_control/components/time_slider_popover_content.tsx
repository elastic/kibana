/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useMemo, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import type { EuiRangeTick } from '@elastic/eui';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import type { TimeSlice } from '@kbn/controls-schemas';
import { TimeSliderStrings } from './time_slider_strings';
import { TimeSliderAnchoredRange } from './time_slider_anchored_range';
import { TimeSliderSlidingWindowRange } from './time_slider_sliding_window_range';

interface Props {
  isAnchored: boolean;
  setIsAnchored: (isAnchored: boolean) => void;
  value: TimeSlice;
  onChange: (value?: TimeSlice) => void;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
  compressed: boolean;
}

export function TimeSliderPopoverContent({
  isAnchored,
  setIsAnchored,
  value,
  onChange,
  stepSize,
  ticks,
  timeRangeMin,
  timeRangeMax,
  compressed,
}: Props) {
  const [displayedValue, setDisplayedValue] = useState<TimeSlice>(value);

  const debouncedOnChange = useMemo(
    () =>
      debounce((updateTimeSlice: TimeSlice | undefined) => {
        onChange(updateTimeSlice);
      }, 750),
    [onChange]
  );

  /**
   * The following `useEffect` ensures that the changes to the value that come from the embeddable (for example,
   * from the `clear` button on the dashboard) are reflected in the displayed value
   */
  useEffect(() => {
    setDisplayedValue(value);
  }, [value]);

  const rangeInput = isAnchored ? (
    <TimeSliderAnchoredRange
      value={[displayedValue[0] || timeRangeMin, displayedValue[1] || timeRangeMax]}
      onChange={(newValue) => {
        setDisplayedValue(newValue as TimeSlice);
        debouncedOnChange(newValue);
      }}
      stepSize={stepSize}
      ticks={ticks}
      timeRangeMin={timeRangeMin}
      timeRangeMax={timeRangeMax}
      compressed={compressed}
    />
  ) : (
    <TimeSliderSlidingWindowRange
      value={[displayedValue[0] || timeRangeMin, displayedValue[1] || timeRangeMax]}
      onChange={(newValue) => {
        setDisplayedValue(newValue as TimeSlice);
        debouncedOnChange(newValue);
      }}
      stepSize={stepSize}
      ticks={ticks}
      timeRangeMin={timeRangeMin}
      timeRangeMax={timeRangeMax}
      compressed={compressed}
    />
  );
  const anchorStartToggleButtonLabel = isAnchored
    ? TimeSliderStrings.control.getUnpinStart()
    : TimeSliderStrings.control.getPinStart();

  return (
    <EuiFlexGroup
      className="rangeSlider__actions"
      gutterSize="none"
      data-test-subj="timeSlider-popoverContents"
      responsive={false}
      onMouseUp={() => {
        // when the pin is dropped (on mouse up), cancel any pending debounced changes and force the change
        // in value to happen instantly (which, in turn, will re-calculate the from/to for the slider due to
        // the `useEffect` above.
        debouncedOnChange.cancel();
        onChange(displayedValue);
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={anchorStartToggleButtonLabel}
          position="left"
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType={isAnchored ? 'pinFilled' : 'pin'}
            onClick={() => {
              const nextIsAnchored = !isAnchored;
              if (nextIsAnchored) {
                onChange([timeRangeMin, value[1]]);
              }
              setIsAnchored(nextIsAnchored);
            }}
            aria-label={anchorStartToggleButtonLabel}
            data-test-subj="timeSlider__anchorStartToggleButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>{rangeInput}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
