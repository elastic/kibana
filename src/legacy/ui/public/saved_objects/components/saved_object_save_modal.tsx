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
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';

interface OnSaveProps {
  newTitle: string;
  newCopyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}

interface Props {
  onSave: (props: OnSaveProps) => void;
  onClose: () => void;
  title: string;
  showCopyOnSave: boolean;
  objectType: string;
  confirmButtonLabel?: React.ReactNode;
  options?: React.ReactNode;
}

interface State {
  title: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  hasTitleDuplicate: boolean;
  isLoading: boolean;
}

export class SavedObjectSaveModal extends React.Component<Props, State> {
  public readonly state = {
    title: this.props.title,
    copyOnSave: false,
    isTitleDuplicateConfirmed: false,
    hasTitleDuplicate: false,
    isLoading: false,
  };

  public render() {
    const { isTitleDuplicateConfirmed, hasTitleDuplicate, title, isLoading } = this.state;

    return (
      <EuiOverlayMask>
        <form onSubmit={this.onFormSubmit}>
          <EuiModal
            data-test-subj="savedObjectSaveModal"
            className="dshSaveModal"
            onClose={this.props.onClose}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="common.ui.savedObjects.saveModal.saveTitle"
                  defaultMessage="Save {objectType}"
                  values={{ objectType: this.props.objectType }}
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              {this.renderDuplicateTitleCallout()}

              <EuiForm>
                {this.renderCopyOnSave()}

                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="common.ui.savedObjects.saveModal.titleLabel"
                      defaultMessage="Title"
                    />
                  }
                >
                  <EuiFieldText
                    autoFocus
                    data-test-subj="savedObjectTitle"
                    value={title}
                    onChange={this.onTitleChange}
                    isInvalid={
                      (!isTitleDuplicateConfirmed && hasTitleDuplicate) || title.length === 0
                    }
                  />
                </EuiFormRow>

                {this.props.options}
              </EuiForm>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty data-test-subj="saveCancelButton" onClick={this.props.onClose}>
                <FormattedMessage
                  id="common.ui.savedObjects.saveModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>

              <EuiButton
                fill
                data-test-subj="confirmSaveSavedObjectButton"
                isLoading={isLoading}
                isDisabled={title.length === 0}
                type="submit"
              >
                {this.props.confirmButtonLabel ? (
                  this.props.confirmButtonLabel
                ) : (
                  <FormattedMessage
                    id="common.ui.savedObjects.saveModal.confirmSaveButtonLabel"
                    defaultMessage="Confirm Save"
                  />
                )}
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </form>
      </EuiOverlayMask>
    );
  }

  private onTitleDuplicate = () => {
    this.setState({
      isLoading: false,
      isTitleDuplicateConfirmed: true,
      hasTitleDuplicate: true,
    });
  };

  private saveSavedObject = async () => {
    if (this.state.isLoading) {
      // ignore extra clicks
      return;
    }

    this.setState({
      isLoading: true,
    });

    await this.props.onSave({
      newTitle: this.state.title,
      newCopyOnSave: this.state.copyOnSave,
      isTitleDuplicateConfirmed: this.state.isTitleDuplicateConfirmed,
      onTitleDuplicate: this.onTitleDuplicate,
    });
  };

  private onTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      title: event.target.value,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
    });
  };

  private onCopyOnSaveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      copyOnSave: event.target.checked,
    });
  };

  private onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.saveSavedObject();
  };

  private renderDuplicateTitleCallout = () => {
    if (!this.state.hasTitleDuplicate) {
      return;
    }

    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="common.ui.savedObjects.saveModal.duplicateTitleLabel"
              defaultMessage="A {objectType} with the title '{title}' already exists."
              values={{ objectType: this.props.objectType, title: this.state.title }}
            />
          }
          color="warning"
          data-test-subj="titleDupicateWarnMsg"
        >
          <p>
            <FormattedMessage
              id="common.ui.savedObjects.saveModal.duplicateTitleDescription"
              defaultMessage="Click {confirmSaveLabel} to save the {objectType} with the duplicate title."
              values={{
                objectType: this.props.objectType,
                confirmSaveLabel: (
                  <strong>
                    <FormattedMessage
                      id="common.ui.savedObjects.saveModal.duplicateTitleDescription.confirmSaveText"
                      defaultMessage="Confirm Save"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  };

  private renderCopyOnSave = () => {
    if (!this.props.showCopyOnSave) {
      return;
    }

    return (
      <Fragment>
        <EuiSwitch
          data-test-subj="saveAsNewCheckbox"
          checked={this.state.copyOnSave}
          onChange={this.onCopyOnSaveChange}
          label={
            <FormattedMessage
              id="common.ui.savedObjects.saveModal.saveAsNewLabel"
              defaultMessage="Save as a new {objectType}"
              values={{ objectType: this.props.objectType }}
            />
          }
        />
        <EuiSpacer />
      </Fragment>
    );
  };
}
