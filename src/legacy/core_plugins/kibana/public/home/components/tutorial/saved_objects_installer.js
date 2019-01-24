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

/* eslint-disable no-multi-str*/

import { injectI18n } from '@kbn/i18n/react';

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

class SavedObjectsInstallerUi extends React.Component {
  DEFAULT_BUTTON_LABEL = this.props.intl.formatMessage({
    id: 'kbn.home.tutorial.savedObject.defaultButtonLabel',
    defaultMessage: 'Load Kibana objects'
  });

  state = {
    isInstalling: false,
    isInstalled: false,
    overwrite: false,
    buttonLabel: this.DEFAULT_BUTTON_LABEL,
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

    let resp;
    try {
      resp = await this.props.bulkCreate(this.props.savedObjects, { overwrite: this.state.overwrite });
    } catch (error) {
      if (!this._isMounted) {
        return;
      }

      this.setState({
        isInstalling: false,
        installStatusMsg: this.props.intl.formatMessage(
          { id: 'kbn.home.tutorial.savedObject.requestFailedErrorMessage', defaultMessage: 'Request failed, Error: {message}' },
          { message: error.message }),
        isInstalled: false,
        overwrite: false,
        buttonLabel: this.DEFAULT_BUTTON_LABEL
      });
      return;
    }

    if (!this._isMounted) {
      return;
    }

    const errors = resp.savedObjects.filter(savedObject => {
      return savedObject.hasOwnProperty('error');
    });

    const overwriteErrors = errors.filter(savedObject => {
      return savedObject.error.statusCode === 409;
    });
    if (overwriteErrors.length > 0) {
      this.setState({
        isInstalling: false,
        installStatusMsg: this.props.intl.formatMessage(
          { id: 'kbn.home.tutorial.savedObject.installStatusLabel',
            defaultMessage: '{overwriteErrorsLength} of {savedObjectsLength} objects already exist. \
Click \'Confirm overwrite\' to import and overwrite existing objects. Any changes to the objects will be lost.' },
          { overwriteErrorsLength: overwriteErrors.length, savedObjectsLength: this.props.savedObjects.length }),
        isInstalled: false,
        overwrite: true,
        buttonLabel: this.props.intl.formatMessage({ id: 'kbn.home.tutorial.savedObject.confirmButtonLabel',
          defaultMessage: 'Confirm overwrite' })
      });
      return;
    }

    const hasErrors = errors.length > 0;
    const statusMsg = hasErrors
      ? this.props.intl.formatMessage(
        { id: 'kbn.home.tutorial.savedObject.unableToAddErrorMessage',
          defaultMessage: 'Unable to add {errorsLength} of {savedObjectsLength} kibana objects, Error: {errorMessage}'
        },
        { errorsLength: errors.length, savedObjectsLength: this.props.savedObjects.length, errorMessage: errors[0].error.message })
      : this.props.intl.formatMessage(
        { id: 'kbn.home.tutorial.savedObject.addedLabel',
          defaultMessage: '{savedObjectsLength} saved objects successfully added'
        },
        { savedObjectsLength: this.props.savedObjects.length });
    this.setState({
      isInstalling: false,
      installStatusMsg: statusMsg,
      isInstalled: !hasErrors,
      overwrite: false,
      buttonLabel: this.DEFAULT_BUTTON_LABEL,
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
      : this.props.intl.formatMessage({ id: 'kbn.home.tutorial.savedObject.installLabel',
        defaultMessage: 'Imports index pattern, visualizations and pre-defined dashboards.' });
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
              {this.state.buttonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {this.renderInstallMessage()}
      </Fragment>
    );

    return {
      title: this.props.intl.formatMessage({ id: 'kbn.home.tutorial.savedObject.loadTitle', defaultMessage: 'Load Kibana objects' }),
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

SavedObjectsInstallerUi.propTypes = {
  bulkCreate: PropTypes.func.isRequired,
  savedObjects: PropTypes.arrayOf(savedObjectShape).isRequired,
  installMsg: PropTypes.string,
};

export const SavedObjectsInstaller = injectI18n(SavedObjectsInstallerUi);
