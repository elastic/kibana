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

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSteps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

export class SavedObjectsInstaller extends React.Component {
  state = {
    isInstalling: false,
    isInstalled: false,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  installSavedObjects = async () => {
    this.setState({
      isInstalling: true,
    });

    const resp = await this.props.bulkCreate(this.props.savedObjects, { overwrite: true });
    if (!this._isMounted) {
      return;
    }

    const errors = resp.savedObjects.filter(savedObjectCreateResult => {
      return savedObjectCreateResult.hasOwnProperty('error');
    });
    const hasErrors = errors.length > 0;

    const statusMsg = hasErrors
      ? `Unable to load kibana saved objects, Error: ${errors[0]}`
      : `${this.props.savedObjects.length} saved objects successfully added`;

    this.setState({
      isInstalling: false,
      installStatusMsg: statusMsg,
      isInstalled: !hasErrors,
    });
  }

  renderInstallMessage() {
    if (!this.state.installStatusMsg) {
      return;
    }

    return (
      <EuiCallOut
        title={this.state.installStatusMsg}
        color={this.state.isInstalled ? 'success' : 'warning'}
        data-test-subj={this.state.isInstalled ? 'loadSavedObjects_success' : 'loadSavedObjects_failed'}
      />
    );
  }

  renderInstallStep = () => {
    const installMsg = this.props.installMsg
      ? this.props.installMsg
      : 'Imports index pattern, visualizations and pre-defined dashboards.';
    const installStep = (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <p>{installMsg}</p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
          >
            <EuiButton
              onClick={this.installSavedObjects}
              isLoading={this.state.isInstalling}
              data-test-subj="loadSavedObjects"
            >
              Load/Import Kibana objects
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {this.renderInstallMessage()}
      </Fragment>
    );

    return {
      title: 'Kibana objects',
      status: this.state.isInstalled ? 'complete' : 'incomplete',
      children: installStep,
      key: 'installStep'
    };
  }

  render() {
    return (
      <EuiSteps
        steps={[this.renderInstallStep()]}
      />
    );
  }
}

const savedObjectShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  attributes: PropTypes.object.isRequired,
});

SavedObjectsInstaller.propTypes = {
  bulkCreate: PropTypes.func.isRequired,
  savedObjects: PropTypes.arrayOf(savedObjectShape).isRequired,
  installMsg: PropTypes.string,
};
