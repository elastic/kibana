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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiTextArea, EuiSwitch } from '@elastic/eui';

import type { SavedObjectsTaggingApi } from '../../../../saved_objects_tagging_oss/public';
import { SavedObjectSaveModal } from '../../../../saved_objects/public';

export interface SaveOptions {
  newTitle: string;
  newDescription: string;
  newTags?: string[];
  newCopyOnSave: boolean;
  newTimeRestore: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}

interface Props {
  onSave: (options: SaveOptions) => void;
  onClose: () => void;
  title: string;
  description: string;
  tags?: string[];
  timeRestore: boolean;
  showCopyOnSave: boolean;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

interface State {
  description: string;
  tags: string[];
  timeRestore: boolean;
}

export class DashboardSaveModal extends React.Component<Props, State> {
  state: State = {
    description: this.props.description,
    timeRestore: this.props.timeRestore,
    tags: this.props.tags ?? [],
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
      newTags: this.state.tags,
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
    const { savedObjectsTagging } = this.props;
    const tagSelector = savedObjectsTagging ? (
      <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
        initialSelection={this.state.tags}
        onTagsSelected={(tags) => {
          this.setState({
            tags,
          });
        }}
      />
    ) : undefined;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="dashboard.topNav.saveModal.descriptionFormRowLabel"
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

        {tagSelector}

        <EuiFormRow
          helpText={
            <FormattedMessage
              id="dashboard.topNav.saveModal.storeTimeWithDashboardFormRowHelpText"
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
                id="dashboard.topNav.saveModal.storeTimeWithDashboardFormRowLabel"
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
        showDescription={false}
      />
    );
  }
}
