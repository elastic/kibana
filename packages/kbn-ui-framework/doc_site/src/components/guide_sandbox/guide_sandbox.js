/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { getIsSandbox } from '../../store';

import { openSandbox, closeSandbox } from '../../actions';

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
    return <div className="guideSandbox">{this.props.children}</div>;
  }
}

GuideSandboxComponent.propTypes = {
  openSandbox: PropTypes.func,
  closeSandbox: PropTypes.func,
};

export const GuideSandbox = connect(
  mapStateToProps,
  mapDispatchToProps
)(GuideSandboxComponent);
