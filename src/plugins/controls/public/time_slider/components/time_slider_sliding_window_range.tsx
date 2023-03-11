/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Ref, ComponentProps } from 'react';
import { EuiDualRange, EuiRangeTick } from '@elastic/eui';
import type { EuiDualRangeClass } from '@elastic/eui/src/components/form/range/dual_range';

// Unfortunately, wrapping EuiDualRange in `withEuiTheme` has created a super annoying/verbose typing
export type EuiDualRangeRef = EuiDualRangeClass & ComponentProps<typeof EuiDualRange>;

interface Props {
  value: [number, number];
  onChange: (value?: [number, number]) => void;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
  rangeRef?: Ref<EuiDualRangeRef>;
}

export function TimeSliderSlidingWindowRange(props: Props) {
  function onChange(value?: [number | string, number | string]) {
    props.onChange(value as [number, number]);
  }

  return (
    <EuiDualRange
      ref={props.rangeRef}
      fullWidth={true}
      value={props.value}
      onChange={onChange}
      showTicks={true}
      min={props.timeRangeMin}
      max={props.timeRangeMax}
      step={props.stepSize}
      ticks={props.ticks}
      isDraggable
    />
  );
}
