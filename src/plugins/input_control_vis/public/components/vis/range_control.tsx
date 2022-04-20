/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React, { PureComponent } from 'react';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { FormRow } from './form_row';
import { RangeControl as RangeControlClass } from '../../control/range_control_factory';

function roundWithPrecision(
  value: number,
  decimalPlaces: number,
  roundFunction: (n: number) => number
) {
  if (decimalPlaces <= 0) {
    return roundFunction(value);
  }

  let results = value;
  results = results * Math.pow(10, decimalPlaces);
  results = roundFunction(results);
  results = results / Math.pow(10, decimalPlaces);
  return results;
}

export function ceilWithPrecision(value: number, decimalPlaces: number) {
  return roundWithPrecision(value, decimalPlaces, Math.ceil);
}

export function floorWithPrecision(value: number, decimalPlaces: number) {
  return roundWithPrecision(value, decimalPlaces, Math.floor);
}

export interface RangeControlState {
  value?: [string, string];
  prevValue?: [string, string];
}

export interface RangeControlProps {
  control: RangeControlClass;
  controlIndex: number;
  stageFilter: (controlIndex: number, value: any) => void;
}

export class RangeControl extends PureComponent<RangeControlProps, RangeControlState> {
  state: RangeControlState = {};

  static getDerivedStateFromProps(nextProps: RangeControlProps, prevState: RangeControlState) {
    const nextValue = nextProps.control.hasValue()
      ? [nextProps.control.value.min, nextProps.control.value.max]
      : ['', ''];

    if (nextProps.control.hasValue() && nextProps.control.value.min == null) {
      nextValue[0] = '';
    }
    if (nextProps.control.hasValue() && nextProps.control.value.max == null) {
      nextValue[1] = '';
    }

    if (nextValue !== prevState.prevValue) {
      return {
        value: nextValue,
        prevValue: nextValue,
      };
    }

    return null;
  }

  onChangeComplete = _.debounce((value: [string, string]) => {
    const controlValue = {
      min: value[0],
      max: value[1],
    };
    this.props.stageFilter(this.props.controlIndex, controlValue);
  }, 200);

  renderControl() {
    if (!this.props.control.isEnabled()) {
      return <ValidatedDualRange disabled showInput />;
    }

    const decimalPlaces = _.get(this.props, 'control.options.decimalPlaces', 0);
    const min = floorWithPrecision(this.props.control.min, decimalPlaces);
    const max = ceilWithPrecision(this.props.control.max, decimalPlaces);

    const ticks = [
      { value: min, label: min },
      { value: max, label: max },
    ];

    return (
      <ValidatedDualRange
        id={this.props.control.id}
        min={min}
        max={max}
        value={this.state.value}
        onChange={this.onChangeComplete}
        showInput
        showRange
        showTicks
        ticks={ticks}
      />
    );
  }

  render() {
    return (
      <FormRow
        id={this.props.control.id}
        label={this.props.control.label}
        controlIndex={this.props.controlIndex}
        disableMsg={this.props.control.isEnabled() ? undefined : this.props.control.disabledReason}
      >
        {this.renderControl()}
      </FormRow>
    );
  }
}
