/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  htmlIdGenerator,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
  onCopyOnSaveChange?: (copyOnChange: boolean) => void;
  initialCopyOnSave?: boolean;
  objectType: string;
  confirmButtonLabel?: React.ReactNode;
  options?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  rightOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  description?: string;
  showDescription: boolean;
  isValid?: boolean;
}

export interface SaveModalState {
  title: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  hasTitleDuplicate: boolean;
  isLoading: boolean;
  visualizationDescription: string;
}

const generateId = htmlIdGenerator();

/**
 * @deprecated
 * @removeBy 8.8.0
 */
export class SavedObjectSaveModal extends React.Component<Props, SaveModalState> {
  private warning = React.createRef<HTMLDivElement>();
  public readonly state = {
    title: this.props.title,
    copyOnSave: Boolean(this.props.initialCopyOnSave),
    isTitleDuplicateConfirmed: false,
    hasTitleDuplicate: false,
    isLoading: false,
    visualizationDescription: this.props.description ? this.props.description : '',
  };

  public render() {
    const { isTitleDuplicateConfirmed, hasTitleDuplicate, title } = this.state;
    const duplicateWarningId = generateId();

    const hasColumns = !!this.props.rightOptions;

    const formBodyContent = (
      <>
        <EuiFormRow
          fullWidth
          label={<FormattedMessage id="savedObjects.saveModal.titleLabel" defaultMessage="Title" />}
        >
          <EuiFieldText
            fullWidth
            autoFocus
            data-test-subj="savedObjectTitle"
            value={title}
            onChange={this.onTitleChange}
            isInvalid={(!isTitleDuplicateConfirmed && hasTitleDuplicate) || title.length === 0}
            aria-describedby={this.state.hasTitleDuplicate ? duplicateWarningId : undefined}
          />
        </EuiFormRow>

        {this.renderViewDescription()}

        {typeof this.props.options === 'function'
          ? this.props.options(this.state)
          : this.props.options}
      </>
    );

    const formBody = hasColumns ? (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>{formBodyContent}</EuiFlexItem>
        <EuiFlexItem>
          {typeof this.props.rightOptions === 'function'
            ? this.props.rightOptions(this.state)
            : this.props.rightOptions}
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      formBodyContent
    );

    return (
      <EuiModal
        data-test-subj="savedObjectSaveModal"
        className={`kbnSavedObjectSaveModal${hasColumns ? ' kbnSavedObjectsSaveModal--wide' : ''}`}
        onClose={this.props.onClose}
      >
        <form onSubmit={this.onFormSubmit} className="euiModal__flex">
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="savedObjects.saveModal.saveTitle"
                defaultMessage="Save {objectType}"
                values={{ objectType: this.props.objectType }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            {this.renderDuplicateTitleCallout(duplicateWarningId)}

            <EuiForm>
              {!this.props.showDescription && this.props.description && (
                <EuiText size="s" color="subdued">
                  {this.props.description}
                </EuiText>
              )}
              {formBody}
              {this.renderCopyOnSave()}
            </EuiForm>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty data-test-subj="saveCancelButton" onClick={this.props.onClose}>
              <FormattedMessage
                id="savedObjects.saveModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            {this.renderConfirmButton()}
          </EuiModalFooter>
        </form>
      </EuiModal>
    );
  }

  private renderViewDescription = () => {
    if (!this.props.showDescription) {
      return;
    }

    return (
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="savedObjects.saveModal.descriptionLabel"
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

    if (this.warning.current) {
      this.warning.current.focus();
    }
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

  private onCopyOnSaveChange = (event: EuiSwitchEvent) => {
    this.setState({
      copyOnSave: event.target.checked,
    });

    if (this.props.onCopyOnSaveChange) {
      this.props.onCopyOnSaveChange(event.target.checked);
    }
  };

  private onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.saveSavedObject();
  };

  private renderConfirmButton = () => {
    const { isLoading, title } = this.state;

    let confirmLabel: string | React.ReactNode = i18n.translate(
      'savedObjects.saveModal.saveButtonLabel',
      {
        defaultMessage: 'Save',
      }
    );

    if (this.props.confirmButtonLabel) {
      confirmLabel = this.props.confirmButtonLabel;
    }

    const isValid = this.props.isValid !== undefined ? this.props.isValid : true;

    return (
      <EuiButton
        fill
        data-test-subj="confirmSaveSavedObjectButton"
        isLoading={isLoading}
        isDisabled={title.length === 0 || !isValid}
        type="submit"
      >
        {confirmLabel}
      </EuiButton>
    );
  };

  private renderDuplicateTitleCallout = (duplicateWarningId: string) => {
    if (!this.state.hasTitleDuplicate) {
      return;
    }

    return (
      <>
        <div ref={this.warning} tabIndex={-1}>
          <EuiCallOut
            title={
              <FormattedMessage
                id="savedObjects.saveModal.duplicateTitleLabel"
                defaultMessage="This {objectType} already exists"
                values={{ objectType: this.props.objectType }}
              />
            }
            color="warning"
            data-test-subj="titleDupicateWarnMsg"
            id={duplicateWarningId}
          >
            <p>
              <FormattedMessage
                id="savedObjects.saveModal.duplicateTitleDescription"
                defaultMessage="Saving '{title}' creates a duplicate title."
                values={{
                  title: this.state.title,
                }}
              />
            </p>
          </EuiCallOut>
        </div>
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
        <EuiSpacer />
        <EuiSwitch
          data-test-subj="saveAsNewCheckbox"
          checked={this.state.copyOnSave}
          onChange={this.onCopyOnSaveChange}
          label={
            <FormattedMessage
              id="savedObjects.saveModal.saveAsNewLabel"
              defaultMessage="Save as new {objectType}"
              values={{ objectType: this.props.objectType }}
            />
          }
        />
      </>
    );
  };
}
