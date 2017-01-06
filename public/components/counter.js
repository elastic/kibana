import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { oneUp, twoUp } from 'plugins/rework/state/actions';

const Counter = React.createClass({
  addOne() {
    const { dispatch } = this.props;
    dispatch(oneUp());
  },
  addTwo() {
    const { dispatch } = this.props;
    dispatch(twoUp());
  },
  render() {
    return (
      <div className="jumbotron">
        <h1>Counter <strong>{this.props.counter}</strong></h1>
        <p>
          Clicking a button below will increase the counter. Adding one works be dispatching a simple object.
          Adding two works by dispatching a function, which dispatches two of the same objects as addings one.
          You can sort out how the store works by looking in <code>public/state</code>. Have fun, the rest is
          up to you.
        </p>
        <p>
          <button className="btn-success" onClick={this.addOne}>+1</button>&nbsp;
          <button className="btn-warning" onClick={this.addTwo}>+2</button>
        </p>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    counter: state.counter
  };
}

export default connect(mapStateToProps)(Counter);
