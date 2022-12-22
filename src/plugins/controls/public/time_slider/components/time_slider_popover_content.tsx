/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { Ref } from 'react';
import {
  EuiButtonIcon,
  EuiRangeTick,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { SettingsForm } from './settings_form';
import { AnchoredRange } from './anchored_range';
import { EuiDualRangeRef, SlidingWindowRange } from './sliding_window_range';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';
import { getIsAnchored } from '../time_slider_selectors';

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

  const { useEmbeddableSelector: select } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  const isAnchored = select(getIsAnchored);
  const rangeInput = isAnchored
    ? <AnchoredRange
        value={props.value}
        onChange={props.onChange}
        stepSize={props.stepSize}
        ticks={ticks}
        timeRangeMin={props.timeRangeMin}
        timeRangeMax={props.timeRangeMax}
      />
    : <SlidingWindowRange 
        value={props.value}
        onChange={props.onChange}
        stepSize={props.stepSize}
        rangeRef={props.rangeRef}
        ticks={ticks}
        timeRangeMin={props.timeRangeMin}
        timeRangeMax={props.timeRangeMax}
      />

  return (
    <>
      <EuiFlexGroup
        className="rangeSlider__actions"
        gutterSize="none"
        data-test-subj="timeSlider-popoverContents"
        responsive={false}
      >
        <EuiFlexItem>
          {rangeInput}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('controls.timeSlider.popover.clearTimeTitle', {
              defaultMessage: 'Clear time selection',
            })}
          >
            <EuiButtonIcon
              iconType="eraser"
              color="danger"
              onClick={props.onClear}
              aria-label={i18n.translate('controls.timeSlider.popover.clearTimeTitle', {
                defaultMessage: 'Clear time selection',
              })}
              data-test-subj="timeSlider__clearTimeButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <SettingsForm value={props.value} onChange={props.onChange} timeRangeMin={props.timeRangeMin}  />
    </>
  );
}
