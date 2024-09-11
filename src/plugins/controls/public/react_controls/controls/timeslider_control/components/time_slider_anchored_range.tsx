/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiRange, EuiRangeTick } from '@elastic/eui';
import { _SingleRangeChangeEvent } from '@elastic/eui/src/components/form/range/types';
import { Timeslice } from '../types';

interface Props {
  value: Timeslice;
  onChange: (value?: Timeslice) => void;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
}

export function TimeSliderAnchoredRange(props: Props) {
  function onChange(e: _SingleRangeChangeEvent) {
    const from = parseInt(e.currentTarget.value, 10);
    if (!isNaN(from)) {
      props.onChange([props.timeRangeMin, from]);
    }
  }

  return (
    <EuiRange
      fullWidth={true}
      value={props.value[1]}
      onChange={onChange}
      showRange
      showTicks={true}
      min={props.timeRangeMin}
      max={props.timeRangeMax}
      step={props.stepSize}
      ticks={props.ticks}
      compressed
    />
  );
}
