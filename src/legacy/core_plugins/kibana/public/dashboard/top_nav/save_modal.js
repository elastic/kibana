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
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import {
  EuiFormRow,
  EuiTextArea,
  EuiSwitch,
} from '@elastic/eui';

class DashboardSaveModalUi extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      description: props.description,
      timeRestore: props.timeRestore,
    };
  }

  saveDashboard = ({ newTitle, newCopyOnSave, isTitleDuplicateConfirmed, onTitleDuplicate }) => {
    this.props.onSave({
      newTitle,
      newDescription: this.state.description,
      newCopyOnSave,
      newTimeRestore: this.state.timeRestore,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    });
  };

  onDescriptionChange = (event) => {
    this.setState({
      description: event.target.value,
    });
  };

  onTimeRestoreChange = (event) => {
    this.setState({
      timeRestore: event.target.checked,
    });
  }

  renderDashboardSaveOptions() {
    return (
      <Fragment>
        <EuiFormRow
          label={<FormattedMessage
            id="kbn.dashboard.topNav.saveModal.descriptionFormRowLabel"
            defaultMessage="Description"
          />}
        >
          <EuiTextArea
            data-test-subj="dashboardDescription"
            value={this.state.description}
            onChange={this.onDescriptionChange}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          label={<FormattedMessage
            id="kbn.dashboard.topNav.saveModal.storeTimeWithDashboardFormRowLabel"
            defaultMessage="Store time with dashboard"
          />}
          helpText={<FormattedMessage
            id="kbn.dashboard.topNav.saveModal.storeTimeWithDashboardFormRowHelpText"
            defaultMessage="This changes the time filter to the currently selected time each time this dashboard is loaded."
          />}
        >
          <EuiSwitch
            data-test-subj="storeTimeWithDashboard"
            checked={this.state.timeRestore}
            onChange={this.onTimeRestoreChange}
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  render() {
    return (
      <SavedObjectSaveModal
        onSave={this.saveDashboard}
        onClose={this.props.onClose}
        title={this.props.title}
        showCopyOnSave={this.props.showCopyOnSave}
        objectType="dashboard"
        options={this.renderDashboardSaveOptions()}
      />
    );
  }
}

DashboardSaveModalUi.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  timeRestore: PropTypes.bool.isRequired,
  showCopyOnSave: PropTypes.bool.isRequired,
};

export const DashboardSaveModal = injectI18n(DashboardSaveModalUi);
