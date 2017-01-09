import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

const Workpad = React.createClass({
  doStuff() {
    const { dispatch } = this.props;
  },
  render() {
    const style = {
      height: this.props.height,
      width: this.props.width,
      backgroundColor: '#fff'
    };

    return (
      <div className="rework--workpad" style={style}>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    height: state.persistent.workpad.height,
    width: state.persistent.workpad.width
  };
}

export default connect(mapStateToProps)(Workpad);
