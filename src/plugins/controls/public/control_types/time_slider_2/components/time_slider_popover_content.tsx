/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { EuiDualRange } from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import { FROM_INDEX, TO_INDEX } from './time_utils';

interface Props {
  initialValue: [number, number];
  onChange: (value: [number, number]) => void;
  ticks: EuiRangeTick[];
  timeRangeMin: number;
  timeRangeMax: number;
}

interface State {
  value: [number, number];
}

export class TimeSliderPopoverContent extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    value: this.props.initialValue,
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  onChange = (value: [number | string, number | string]) => {
    this.setState({
      value: value as [number, number],
    });
    this.propagateChange(value as [number, number]);
  };

  propagateChange = _.debounce((value: [number, number]) => {
    if (this._isMounted) {
      this.props.onChange(value);
    }
  }, 300);

  render() {
    return (
      <EuiDualRange
        fullWidth={true}
        value={this.state.value}
        onChange={this.onChange}
        showTicks={true}
        min={this.props.timeRangeMin}
        max={this.props.timeRangeMax}
        step={1}
        ticks={this.props.ticks}
        isDraggable
      />
    );
  }
}