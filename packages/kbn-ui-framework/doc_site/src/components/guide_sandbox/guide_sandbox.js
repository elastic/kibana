import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import {
  getIsSandbox,
} from '../../store';

import {
  openSandbox,
  closeSandbox,
} from '../../actions';

function mapStateToProps(state) {
  return {
    isSandbox: getIsSandbox(state),
  };
}

function mapDispatchToProps(dispatch) {
  const actions = {
    openSandbox,
    closeSandbox,
  };

  return bindActionCreators(actions, dispatch);
}

class GuideSandboxComponent extends Component {
  componentWillMount() {
    this.props.openSandbox();
  }

  componentWillUnmount() {
    this.props.closeSandbox();
  }

  render() {
    return (
      <div className="guideSandbox">
        {this.props.children}
      </div>
    );
  }
}

GuideSandboxComponent.propTypes = {
  openSandbox: PropTypes.func,
  closeSandbox: PropTypes.func,
};

export const GuideSandbox = connect(mapStateToProps, mapDispatchToProps)(GuideSandboxComponent);
