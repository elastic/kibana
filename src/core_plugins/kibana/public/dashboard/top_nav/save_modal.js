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
  EuiButton,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiCallOut,
  EuiForm,
  EuiFormRow,
  EuiTextArea,
  EuiSwitch,
} from '@elastic/eui';

export class DashboardSaveModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      title: props.title,
      description: props.description,
      copyOnSave: false,
      timeRestore: props.timeRestore,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
      isLoading: false,
    };
  }
  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onTitleDuplicate = () => {
    this.setState({
      isLoading: false,
      isTitleDuplicateConfirmed: true,
      hasTitleDuplicate: true,
    });
  }

  saveDashboard = async () => {
    if (this.state.isLoading) {
      // ignore extra clicks
      return;
    }

    this.setState({
      isLoading: true,
    });

    await this.props.onSave({
      newTitle: this.state.title,
      newDescription: this.state.description,
      newCopyOnSave: this.state.copyOnSave,
      newTimeRestore: this.state.timeRestore,
      isTitleDuplicateConfirmed: this.state.isTitleDuplicateConfirmed,
      onTitleDuplicate: this.onTitleDuplicate,
    });
  };

  onTitleChange = (event) => {
    this.setState({
      title: event.target.value,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
    });
  };

  onDescriptionChange = (event) => {
    this.setState({
      description: event.target.value,
    });
  };

  onCopyOnSaveChange = (event) => {
    this.setState({
      copyOnSave: event.target.checked,
    });
  }

  onTimeRestoreChange = (event) => {
    this.setState({
      timeRestore: event.target.checked,
    });
  }

  renderDuplicateTitleCallout = () => {
    if (!this.state.hasTitleDuplicate) {
      return;
    }

    return (
      <Fragment>
        <EuiCallOut
          title={`A Dashboard with the title '${this.state.title}' already exists.`}
          color="warning"
          data-test-subj="titleDupicateWarnMsg"
        >
          <p>
            Click <strong>Confirm Save</strong> to save the dashboard with the duplicate title.
          </p>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  renderCopyOnSave = () => {
    if (!this.props.showCopyOnSave) {
      return;
    }

    return (
      <EuiFormRow
        label="Save as a new dashboard"
      >
        <EuiSwitch
          data-test-subj="saveAsNewCheckbox"
          checked={this.state.copyOnSave}
          onChange={this.onCopyOnSaveChange}
        />
      </EuiFormRow>
    );
  }

  render() {
    return (
      <EuiOverlayMask>
        <EuiModal
          data-test-subj="dashboardSaveModal"
          className="dashboardModal"
          onClose={this.props.onClose}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              Save Dashboard
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>

            {this.renderDuplicateTitleCallout()}

            <EuiForm>

              {this.renderCopyOnSave()}

              <EuiFormRow
                label="Title"
              >
                <EuiFieldText
                  autoFocus
                  data-test-subj="dashboardTitle"
                  value={this.state.title}
                  onChange={this.onTitleChange}
                  isInvalid={this.state.hasTitleDuplicate}
                />
              </EuiFormRow>

              <EuiFormRow
                label="Description"
              >
                <EuiTextArea
                  data-test-subj="dashboardDescription"
                  value={this.state.description}
                  onChange={this.onDescriptionChange}
                  compressed
                />
              </EuiFormRow>

              <EuiFormRow
                label="Store time with dashboard"
                helpText="This changes the time filter to the currently selected time each time this dashboard is loaded."
              >
                <EuiSwitch
                  data-test-subj="storeTimeWithDashboard"
                  checked={this.state.timeRestore}
                  onChange={this.onTimeRestoreChange}
                />
              </EuiFormRow>

            </EuiForm>

          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton
              data-test-subj="saveCancelButton"
              onClick={this.props.onClose}
            >
              Cancel
            </EuiButton>

            <EuiButton
              fill
              data-test-subj="confirmSaveDashboardButton"
              onClick={this.saveDashboard}
              isLoading={this.state.isLoading}
            >
              Confirm Save
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }
}

DashboardSaveModal.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  timeRestore: PropTypes.bool.isRequired,
  showCopyOnSave: PropTypes.bool.isRequired,
};
