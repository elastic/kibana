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

const INCOMPLETE = 'incomplete';
const COMPLETE = 'complete';

export class SavedObjectsInstaller extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isInstalling: false,
      installStatus: INCOMPLETE,
    };
  }

  installSavedObjects = async () => {
    this.setState({
      isInstalling: true,
    });

    const resp = await this.props.bulkCreate(this.props.savedObjects, { overwrite: true });
    const errors = resp.filter(savedObjectCreateResult => {
      return savedObjectCreateResult.hasOwnProperty('error');
    });

    let statusMsg = `${this.props.savedObjects.length} saved objects successfully added`;
    if (errors.length > 0) {
      statusMsg = `Unable to load kibana saved objects, Error: ${errors[0]}`;
    }

    this.setState({
      isInstalling: false,
      installStatusMsg: statusMsg,
      installStatus: errors.length === 0 ? COMPLETE : INCOMPLETE,
    });
  }

  renderInstallMessage() {
    if (!this.state.installStatusMsg) {
      return;
    }

    return (
      <EuiCallOut
        title={this.state.installStatusMsg}
        color={this.state.installStatus === COMPLETE ? 'success' : 'warning'}
      />
    );
  }

  renderInstallStep() {
    const installStep = (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <p>
                Click button to add Kibana objects for module
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
          >
            <EuiButton
              onClick={this.installSavedObjects}
              isLoading={this.state.isInstalling}
            >
              Add
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {this.renderInstallMessage()}
      </Fragment>
    );

    return {
      title: 'Load Kibana objects',
      status: this.state.installStatus,
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
};
