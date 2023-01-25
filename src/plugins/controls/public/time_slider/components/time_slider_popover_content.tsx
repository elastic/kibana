/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Ref } from 'react';
import { EuiButtonIcon, EuiRangeTick, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import { getIsAnchored } from '../time_slider_selectors';
import { TimeSliderStrings } from './time_slider_strings';
import { useTimeSlider } from '../embeddable/time_slider_embeddable';
import { TimeSliderAnchoredRange } from './time_slider_anchored_range';
import { EuiDualRangeRef, TimeSliderSlidingWindowRange } from './time_slider_sliding_window_range';

interface Props {
  value: [number, number];
  onChange: (value?: [number, number]) => void;
  onClear: () => void;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
  rangeRef?: Ref<EuiDualRangeRef>;
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

  const timeSlider = useTimeSlider();
  const isAnchored = timeSlider.select(getIsAnchored);
  const rangeInput = isAnchored ? (
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
      rangeRef={props.rangeRef}
      ticks={ticks}
      timeRangeMin={props.timeRangeMin}
      timeRangeMax={props.timeRangeMax}
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
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={anchorStartToggleButtonLabel}>
          <EuiButtonIcon
            iconType={isAnchored ? 'pin' : 'pinFilled'}
            onClick={() => {
              const nextIsAnchored = !isAnchored;
              if (nextIsAnchored) {
                props.onChange([props.timeRangeMin, props.value[1]]);
              }
              timeSlider.dispatch.setIsAnchored({ isAnchored: nextIsAnchored });
            }}
            aria-label={anchorStartToggleButtonLabel}
            data-test-subj="timeSlider__anchorStartToggleButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>{rangeInput}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={TimeSliderStrings.control.getClearSelection()}>
          <EuiButtonIcon
            iconType="eraser"
            color="danger"
            onClick={props.onClear}
            aria-label={TimeSliderStrings.control.getClearSelection()}
            data-test-subj="timeSlider__clearTimeButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
