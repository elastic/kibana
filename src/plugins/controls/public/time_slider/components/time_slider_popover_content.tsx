/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { Ref } from 'react';
import { EuiButtonIcon, EuiDualRange, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';

interface Props {
  value: [number, number];
  onChange: (value?: [number, number]) => void;
  onClear: () => void;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
  rangeRef?: Ref<EuiDualRange>;
}

export function TimeSliderPopoverContent(props: Props) {
  function onChange(value?: [number | string, number | string]) {
    props.onChange(value as [number, number]);
  }

  return (
    <EuiFlexGroup
      className="rangeSlider__actions"
      gutterSize="none"
      data-test-subj="timeSlider-control-actions"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiDualRange
          ref={props.rangeRef}
          fullWidth={true}
          value={props.value}
          onChange={onChange}
          showTicks={true}
          min={props.timeRangeMin}
          max={props.timeRangeMax}
          step={1}
          ticks={props.ticks}
          isDraggable
        />
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
  );
}
