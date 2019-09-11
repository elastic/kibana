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
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../legacy/core_plugins/kibana/public/visualize/embeddable/constants';

export interface OnSaveProps {
  newTitle: string;
  newCopyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
  newDescription: string;
}

interface Props {
  onSave: (props: OnSaveProps) => void;
  onClose: () => void;
  title: string;
  showCopyOnSave: boolean;
  objectType: string;
  confirmButtonLabel?: React.ReactNode;
  options?: React.ReactNode;
  description?: string;
}

interface State {
  title: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  hasTitleDuplicate: boolean;
  isLoading: boolean;
  visualizationDescription: string;
}

export class SavedObjectSaveModal extends React.Component<Props, State> {
  public readonly state = {
    title: this.props.title,
    copyOnSave: false,
    isTitleDuplicateConfirmed: false,
    hasTitleDuplicate: false,
    isLoading: false,
    visualizationDescription: this.props.description ? this.props.description : '',
  };

  public render() {
    const { isTitleDuplicateConfirmed, hasTitleDuplicate, title } = this.state;

    return (
      <EuiOverlayMask>
        <form onSubmit={this.onFormSubmit}>
          <EuiModal
            data-test-subj="savedObjectSaveModal"
            className="kbnSavedObjectSaveModal"
            onClose={this.props.onClose}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="kibana-react.savedObjects.saveModal.saveTitle"
                  defaultMessage="Save {objectType}"
                  values={{ objectType: this.props.objectType }}
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              {this.renderDuplicateTitleCallout()}

              <EuiForm>
                {this.props.objectType !== VISUALIZE_EMBEDDABLE_TYPE && this.props.description && (
                  <EuiFormRow>
                    <EuiText color="subdued">{this.props.description}</EuiText>
                  </EuiFormRow>
                )}
                {this.renderCopyOnSave()}

                <EuiFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="kibana-react.savedObjects.saveModal.titleLabel"
                      defaultMessage="Title"
                    />
                  }
                >
                  <EuiFieldText
                    fullWidth
                    autoFocus
                    data-test-subj="savedObjectTitle"
                    value={title}
                    onChange={this.onTitleChange}
                    isInvalid={
                      (!isTitleDuplicateConfirmed && hasTitleDuplicate) || title.length === 0
                    }
                  />
                </EuiFormRow>

                {this.renderViewDescription()}

                {this.props.options}
              </EuiForm>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty data-test-subj="saveCancelButton" onClick={this.props.onClose}>
                <FormattedMessage
                  id="kibana-react.savedObjects.saveModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>

              {this.renderConfirmButton()}
            </EuiModalFooter>
          </EuiModal>
        </form>
      </EuiOverlayMask>
    );
  }

  private renderViewDescription = () => {
    if (this.props.objectType !== VISUALIZE_EMBEDDABLE_TYPE) {
      return;
    }

    return (
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="kibana-react.savedObjects.saveModal.descriptionLabel"
            defaultMessage="Description"
          />
        }
      >
        <EuiTextArea
          data-test-subj="viewDescription"
          value={this.state.visualizationDescription}
          onChange={this.onDescriptionChange}
        />
      </EuiFormRow>
    );
  };

  private onDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      visualizationDescription: event.target.value,
    });
  };

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
      newDescription: this.state.visualizationDescription,
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

  private renderConfirmButton = () => {
    const { isLoading, title, hasTitleDuplicate } = this.state;

    let confirmLabel: string | React.ReactNode = hasTitleDuplicate
      ? i18n.translate('kibana-react.savedObjects.saveModal.confirmSaveButtonLabel', {
          defaultMessage: 'Confirm save',
        })
      : i18n.translate('kibana-react.savedObjects.saveModal.saveButtonLabel', {
          defaultMessage: 'Save',
        });

    if (this.props.confirmButtonLabel) {
      confirmLabel = this.props.confirmButtonLabel;
    }

    return (
      <EuiButton
        fill
        data-test-subj="confirmSaveSavedObjectButton"
        isLoading={isLoading}
        isDisabled={title.length === 0}
        type="submit"
      >
        {confirmLabel}
      </EuiButton>
    );
  };

  private renderDuplicateTitleCallout = () => {
    if (!this.state.hasTitleDuplicate) {
      return;
    }

    return (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="kibana-react.savedObjects.saveModal.duplicateTitleLabel"
              defaultMessage="A {objectType} with the title '{title}' already exists."
              values={{ objectType: this.props.objectType, title: this.state.title }}
            />
          }
          color="warning"
          data-test-subj="titleDupicateWarnMsg"
        >
          <p>
            <FormattedMessage
              id="kibana-react.savedObjects.saveModal.duplicateTitleDescription"
              defaultMessage="Click {confirmSaveLabel} to save the {objectType} with the duplicate title."
              values={{
                objectType: this.props.objectType,
                confirmSaveLabel: (
                  <strong>
                    {this.props.confirmButtonLabel
                      ? this.props.confirmButtonLabel
                      : i18n.translate(
                          'kibana-react.savedObjects.saveModal.duplicateTitleDescription.confirmSaveText',
                          {
                            defaultMessage: 'Confirm save',
                          }
                        )}
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer />
      </>
    );
  };

  private renderCopyOnSave = () => {
    if (!this.props.showCopyOnSave) {
      return;
    }

    return (
      <>
        <EuiSwitch
          data-test-subj="saveAsNewCheckbox"
          checked={this.state.copyOnSave}
          onChange={this.onCopyOnSaveChange}
          label={
            <FormattedMessage
              id="kibana-react.savedObjects.saveModal.saveAsNewLabel"
              defaultMessage="Save as a new {objectType}"
              values={{ objectType: this.props.objectType }}
            />
          }
        />
        <EuiSpacer />
      </>
    );
  };
}
