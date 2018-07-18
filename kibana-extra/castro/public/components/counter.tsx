/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { decrease, increase } from '../actions';
import { RootState } from '../reducers';

import { EuiButton } from '@elastic/eui';

interface Props {
  count: number;
  onIncrease: typeof increase;
  onDecrease: typeof decrease;
}

class Counter extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  public increase = () => {
    console.log('Click increase.'); // tslint:disable-line no-console
    this.props.onIncrease(1);
  };

  public decrease = () => {
    console.log('Click decrease.'); // tslint:disable-line no-console
    this.props.onDecrease(1);
  };

  public render() {
    return (
      <div>
        <p>Current Count: {this.props.count}</p>
        <EuiButton size="s" fill={true} onClick={this.increase}>
          Increase
        </EuiButton>
        <EuiButton size="s" fill={true} onClick={this.decrease}>
          Decrease
        </EuiButton>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  count: state.count,
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onIncrease: increase,
      onDecrease: decrease,
    },
    dispatch
  );

const CounterContainer = connect(mapStateToProps, mapDispatchToProps)(Counter);

export default CounterContainer;
