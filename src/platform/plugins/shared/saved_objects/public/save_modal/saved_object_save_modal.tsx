/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  EuiText,
  withEuiTheme,
  WithEuiThemeProps,
  mathWithUnits,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface OnSaveProps {
  newTitle: string;
  newCopyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
  newDescription: string;
}

interface Props {
  onSave: (props: OnSaveProps) => Promise<void>;
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
  theme: WithEuiThemeProps['theme'];
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
class SavedObjectSaveModalComponent extends React.Component<
  Props,
  SaveModalState,
  WithEuiThemeProps
> {
  private warning = React.createRef<HTMLDivElement>();
  private formId = generateId('form');

  public readonly state = {
    title: this.props.title,
    copyOnSave: Boolean(this.props.initialCopyOnSave),
    isTitleDuplicateConfirmed: false,
    hasTitleDuplicate: false,
    isLoading: false,
    visualizationDescription: this.props.description ? this.props.description : '',
    hasAttemptedSubmit: false,
  };

  public render() {
    const { theme } = this.props;
    const { isTitleDuplicateConfirmed, hasTitleDuplicate, title, hasAttemptedSubmit } = this.state;
    const duplicateWarningId = generateId();
    const modalTitleId = generateId('saveModal');
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
    const styles = css({
      width: hasColumns
        ? mathWithUnits(theme.euiTheme.size.xxl, (x) => x * 20)
        : mathWithUnits(theme.euiTheme.size.xxl, (x) => x * 15),
    });

    return (
      <EuiModal
        data-test-subj="savedObjectSaveModal"
        onClose={this.props.onClose}
        css={styles}
        aria-labelledby={modalTitleId}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
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

    try {
      await this.props.onSave({
        newTitle: this.state.title,
        newCopyOnSave: Boolean(this.props.mustCopyOnSaveMessage) || this.state.copyOnSave,
        isTitleDuplicateConfirmed: this.state.isTitleDuplicateConfirmed,
        onTitleDuplicate: this.onTitleDuplicate,
        newDescription: this.state.visualizationDescription,
      });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  private onTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      title: event.target.value,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
    });
  };

  private handleTitleDuplication = () => {
    const regex = /\s*\[(\d+)\]$/;
    const match = this.state.title.match(regex);

    if (match) {
      const newNumber = Number(match[1]) + 1;

      this.setState({
        title: this.state.title.replace(regex, ` [${newNumber}]`),
      });
    } else {
      this.setState({
        title: this.state.title + ' [1]',
      });
    }
  };

  private onCopyOnSaveChange = (event: EuiSwitchEvent) => {
    if (this.props.title === this.state.title && event.target.checked) {
      this.handleTitleDuplication();
    }

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
          <EuiFlexItem
            css={({ euiTheme }) => ({ marginLeft: `-${euiTheme.size.base}` })}
            grow={false}
          >
            <EuiIconTip type="info" content={this.props.mustCopyOnSaveMessage} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true} />
      </>
    );
  };
}

export const SavedObjectSaveModal = withEuiTheme(SavedObjectSaveModalComponent);
