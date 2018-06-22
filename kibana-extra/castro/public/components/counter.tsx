import React from 'react';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { RootState } from '../reducers';
import { increase, decrease } from '../actions';

import {
  EuiButton
} from '@elastic/eui';

interface Props {
  count: number,
  onIncrease: ((amount: number) => void),
  onDecrease: ((amount: number) => void)
}

interface State {
}

class Counter extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  increase(): void {
    console.log("Click increase.");
    this.props.onIncrease(1);
  }

  decrease(): void {
    console.log("Click decrease.");
    this.props.onDecrease(1);
  }

  render() {
    return (
      <div>
        <p>Current Count: {this.props.count}</p>
        <EuiButton size="s" fill onClick={() => this.increase()}>
          Increase
        </EuiButton>
        <EuiButton size="s" fill onClick={() => this.decrease()}>
          Decrease
        </EuiButton>
      </div>
    )
  }
}

const mapStateToProps = (state: RootState) => ({
  count: state.count
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  onIncrease: increase,
  onDecrease: decrease
}, dispatch);

const CounterContainer = connect(mapStateToProps, mapDispatchToProps)(Counter);

export default CounterContainer;
