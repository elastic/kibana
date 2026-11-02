/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiRangeTick } from '@elastic/eui';
import { EuiDualRange } from '@elastic/eui';
import type { TimeSlice } from '@kbn/controls-schemas';

interface Props {
  value: TimeSlice;
  onChange: (value?: TimeSlice) => void;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
  compressed: boolean;
}

export function TimeSliderSlidingWindowRange(props: Props) {
  function onChange(value?: [number | string, number | string]) {
    props.onChange(value as TimeSlice);
  }

  return (
    <EuiDualRange
      fullWidth={true}
      value={props.value}
      onChange={onChange}
      showTicks={true}
      min={props.timeRangeMin}
      max={props.timeRangeMax}
      step={props.stepSize}
      ticks={props.ticks}
      isDraggable
      compressed={props.compressed}
    />
  );
}
