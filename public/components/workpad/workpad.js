import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

const Workpad = React.createClass({
  doStuff() {
    const { dispatch } = this.props;
  },
  render() {
    return (
      <div className="rework--workpad">
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {};
}

export default connect(mapStateToProps)(Workpad);
