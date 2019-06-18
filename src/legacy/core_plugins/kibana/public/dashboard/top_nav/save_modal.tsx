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
import { injectI18n, FormattedMessage, InjectedIntl } from '@kbn/i18n/react';

import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { EuiFormRow, EuiTextArea, EuiSwitch } from '@elastic/eui';

interface SaveOptions {
  newTitle: string;
  newDescription: string;
  newCopyOnSave: boolean;
  newTimeRestore: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}

interface Props {
  onSave: (
    {
      newTitle,
      newDescription,
      newCopyOnSave,
      newTimeRestore,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    }: SaveOptions
  ) => void;
  onClose: () => void;
  title: string;
  description: string;
  timeRestore: boolean;
  showCopyOnSave: boolean;
  intl: InjectedIntl;
}

interface State {
  description: string;
  timeRestore: boolean;
}

class DashboardSaveModalUi extends React.Component<Props, State> {
  state: State = {
    description: this.props.description,
    timeRestore: this.props.timeRestore,
  };

  constructor(props: Props) {
    super(props);
  }

  saveDashboard = ({
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: {
    newTitle: string;
    newCopyOnSave: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => {
    this.props.onSave({
      newTitle,
      newDescription: this.state.description,
      newCopyOnSave,
      newTimeRestore: this.state.timeRestore,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    });
  };

  onDescriptionChange = (event: any) => {
    this.setState({
      description: event.target.value,
    });
  };

  onTimeRestoreChange = (event: any) => {
    this.setState({
      timeRestore: event.target.checked,
    });
  };

  renderDashboardSaveOptions() {
    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="kbn.dashboard.topNav.saveModal.descriptionFormRowLabel"
              defaultMessage="Description"
            />
          }
        >
          <EuiTextArea
            data-test-subj="dashboardDescription"
            value={this.state.description}
            onChange={this.onDescriptionChange}
          />
        </EuiFormRow>

        <EuiFormRow
          helpText={
            <FormattedMessage
              id="kbn.dashboard.topNav.saveModal.storeTimeWithDashboardFormRowHelpText"
              defaultMessage="This changes the time filter to the currently selected time each time this dashboard is loaded."
            />
          }
        >
          <EuiSwitch
            data-test-subj="storeTimeWithDashboard"
            checked={this.state.timeRestore}
            onChange={this.onTimeRestoreChange}
            label={
              <FormattedMessage
                id="kbn.dashboard.topNav.saveModal.storeTimeWithDashboardFormRowLabel"
                defaultMessage="Store time with dashboard"
              />
            }
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

export const DashboardSaveModal = injectI18n(DashboardSaveModalUi);
