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
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

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
  mustCopyOnSaveMessage?: string;
  onCopyOnSaveChange?: (copyOnChange: boolean) => void;
  initialCopyOnSave?: boolean;
  objectType: string;
  confirmButtonLabel?: React.ReactNode;
  options?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  rightOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  description?: string;
  showDescription: boolean;
  isValid?: boolean;
  customModalTitle?: string;
}

export interface SaveModalState {
  title: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  hasTitleDuplicate: boolean;
  isLoading: boolean;
  visualizationDescription: string;
  hasAttemptedSubmit: boolean;
}

const generateId = htmlIdGenerator();

/**
 * @deprecated
 * @removeBy 8.8.0
 */
export class SavedObjectSaveModal extends React.Component<Props, SaveModalState> {
  private warning = React.createRef<HTMLDivElement>();
  private formId = generateId('form');
  private savedObjectTitleInputRef = React.createRef<HTMLInputElement>();

  public readonly state = {
    title: this.props.title,
    copyOnSave: Boolean(this.props.initialCopyOnSave),
    isTitleDuplicateConfirmed: false,
    hasTitleDuplicate: false,
    isLoading: false,
    visualizationDescription: this.props.description ? this.props.description : '',
    hasAttemptedSubmit: false,
  };

  public componentDidMount() {
    setTimeout(() => {
      // defer so input focus ref value has been populated
      this.savedObjectTitleInputRef.current?.focus();
    }, 0);
  }

  public render() {
    const { isTitleDuplicateConfirmed, hasTitleDuplicate, title, hasAttemptedSubmit } = this.state;
    const duplicateWarningId = generateId();

    const hasColumns = !!this.props.rightOptions;

    const titleInputValid =
      hasAttemptedSubmit &&
      ((!isTitleDuplicateConfirmed && hasTitleDuplicate) || title.length === 0);

    const formBodyContent = (
      <>
        <EuiFormRow
          fullWidth
          label={<FormattedMessage id="savedObjects.saveModal.titleLabel" defaultMessage="Title" />}
          isInvalid={titleInputValid}
          error={i18n.translate('savedObjects.saveModal.titleRequired', {
            defaultMessage: 'A title is required',
          })}
        >
          <EuiFieldText
            fullWidth
            inputRef={this.savedObjectTitleInputRef}
            data-test-subj="savedObjectTitle"
            value={title}
            onChange={this.onTitleChange}
            isInvalid={titleInputValid}
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
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {this.props.customModalTitle ? (
              this.props.customModalTitle
            ) : (
              <FormattedMessage
                id="savedObjects.saveModal.saveTitle"
                defaultMessage="Save {objectType}"
                values={{ objectType: this.props.objectType }}
              />
            )}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {this.renderDuplicateTitleCallout(duplicateWarningId)}

          <EuiForm component="form" onSubmit={this.onFormSubmit} id={this.formId}>
            {!this.props.showDescription && this.props.description && (
              <EuiText size="s" color="subdued">
                {this.props.description}
              </EuiText>
            )}
            {formBody}
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
            {this.props.showCopyOnSave && this.renderCopyOnSave()}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="saveCancelButton" onClick={this.props.onClose}>
                <FormattedMessage
                  id="savedObjects.saveModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{this.renderConfirmButton()}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
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
        labelAppend={
          <EuiText size="xs" color="subdued">
            <FormattedMessage id="savedObjects.saveModal.optional" defaultMessage="Optional" />
          </EuiText>
        }
        label={
          <FormattedMessage
            id="savedObjects.saveModal.descriptionLabel"
            defaultMessage="Description"
          />
        }
      >
        <EuiTextArea
          fullWidth
          data-test-subj="savedObjectDescription"
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
      newCopyOnSave: Boolean(this.props.mustCopyOnSaveMessage) || this.state.copyOnSave,
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

    const { hasAttemptedSubmit, title } = this.state;

    if (!hasAttemptedSubmit) {
      this.setState({ hasAttemptedSubmit: true });
    }

    const isValid = this.props.isValid !== undefined ? this.props.isValid : true;

    if (title.length !== 0 && isValid) {
      this.saveSavedObject();
    }
  };

  private renderConfirmButton = () => {
    const { isLoading } = this.state;

    let confirmLabel: string | React.ReactNode = i18n.translate(
      'savedObjects.saveModal.saveButtonLabel',
      {
        defaultMessage: 'Save',
      }
    );

    if (this.props.confirmButtonLabel) {
      confirmLabel = this.props.confirmButtonLabel;
    }

    return (
      <EuiButton
        fill
        data-test-subj="confirmSaveSavedObjectButton"
        isLoading={isLoading}
        type="submit"
        form={this.formId}
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
            data-test-subj="titleDuplicateWarnMsg"
            id={duplicateWarningId}
          >
            <p>
              <FormattedMessage
                id="savedObjects.saveModal.duplicateTitleDescription"
                defaultMessage="Saving ''{title}'' creates a duplicate title."
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
    return (
      <>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            data-test-subj="saveAsNewCheckbox"
            checked={Boolean(this.props.mustCopyOnSaveMessage) || this.state.copyOnSave}
            disabled={Boolean(this.props.mustCopyOnSaveMessage)}
            onChange={this.onCopyOnSaveChange}
            label={
              <FormattedMessage
                id="savedObjects.saveModal.saveAsNewLabel"
                defaultMessage="Save as new {objectType}"
                values={{ objectType: this.props.objectType }}
              />
            }
          />
        </EuiFlexItem>
        {this.props.mustCopyOnSaveMessage && (
          <EuiFlexItem css={{ marginLeft: `-${euiThemeVars.euiSize}` }} grow={false}>
            <EuiIconTip type="iInCircle" content={this.props.mustCopyOnSaveMessage} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true} />
      </>
    );
  };
}
