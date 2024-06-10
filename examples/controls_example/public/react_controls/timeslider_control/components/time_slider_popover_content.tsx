/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonIcon, EuiRangeTick, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import { TimeSliderStrings } from './time_slider_strings';
import { TimeSliderAnchoredRange } from './time_slider_anchored_range';
import { TimeSliderSlidingWindowRange } from './time_slider_sliding_window_range';
import { Timeslice } from '../types';

interface Props {
  isAnchored: boolean;
  setIsAnchored: (isAnchored: boolean) => void;
  value: Timeslice;
  onChange: (value?: Timeslice) => void;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
}

export function TimeSliderPopoverContent(props: Props) {
  const ticks =
    props.ticks.length <= 12
      ? props.ticks
      : props.ticks.map((tick, index) => {
          return {
            value: tick.value,
            // to avoid label overlap, only display even tick labels
            // Passing empty string as tick label results in tick not rendering, so must wrap empty label in react element
            // Can not store react node in redux state because its not serializable so have to transform into react node here
            label: index % 2 === 0 ? tick.label : <span>&nbsp;</span>,
          };
        });

  const rangeInput = props.isAnchored ? (
    <TimeSliderAnchoredRange
      value={props.value}
      onChange={props.onChange}
      stepSize={props.stepSize}
      ticks={ticks}
      timeRangeMin={props.timeRangeMin}
      timeRangeMax={props.timeRangeMax}
    />
  ) : (
    <TimeSliderSlidingWindowRange
      value={props.value}
      onChange={props.onChange}
      stepSize={props.stepSize}
      ticks={ticks}
      timeRangeMin={props.timeRangeMin}
      timeRangeMax={props.timeRangeMax}
    />
  );
  const anchorStartToggleButtonLabel = props.isAnchored
    ? TimeSliderStrings.control.getUnpinStart()
    : TimeSliderStrings.control.getPinStart();

  return (
    <EuiFlexGroup
      className="rangeSlider__actions"
      gutterSize="none"
      data-test-subj="timeSlider-popoverContents"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={anchorStartToggleButtonLabel} position="left">
          <EuiButtonIcon
            iconType={props.isAnchored ? 'pinFilled' : 'pin'}
            onClick={() => {
              const nextIsAnchored = !props.isAnchored;
              if (nextIsAnchored) {
                props.onChange([props.timeRangeMin, props.value[1]]);
              }
              props.setIsAnchored(nextIsAnchored);
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
