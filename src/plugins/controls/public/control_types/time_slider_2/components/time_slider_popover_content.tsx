/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiDualRange } from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';

interface Props {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
}

export function TimeSliderPopoverContent(props: Props) {
  function onChange(value: [number | string, number | string]) {
    props.onChange(value as [number, number]);
  }

  return (
    <EuiDualRange
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
  );
}
