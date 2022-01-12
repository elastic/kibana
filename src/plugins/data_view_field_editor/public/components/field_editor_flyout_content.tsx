/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
} from '@elastic/eui';

import type { Field } from '../types';
import { euiFlyoutClassname } from '../constants';
import { FlyoutPanels } from './flyout_panels';
import { useFieldEditorContext } from './field_editor_context';
import { FieldEditor, FieldEditorFormState } from './field_editor/field_editor';
import { FieldPreview, useFieldPreviewContext } from './preview';
import { ModifiedFieldModal, SaveFieldTypeOrNameChangedModal } from './confirm_modals';

const i18nTexts = {
  cancelButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutCancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  saveButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutSaveButtonLabel', {
    defaultMessage: 'Save',
  }),
};

const defaultModalVisibility = {
  confirmChangeNameOrType: false,
  confirmUnsavedChanges: false,
};

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (field: Field) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  /** Optional field to process */
  field?: Field;
  isSavingField: boolean;
  /** Handler to call when the component mounts.
   *  We will pass "up" data that the parent component might need
   */
  onMounted?: (args: { canCloseValidator: () => boolean }) => void;
}

const FieldEditorFlyoutContentComponent = ({
  field,
  onSave,
  onCancel,
  isSavingField,
  onMounted,
}: Props) => {
  const isMounted = useRef(false);
  const isEditingExistingField = !!field;
  const { dataView } = useFieldEditorContext();
  const {
    panel: { isVisible: isPanelVisible },
  } = useFieldPreviewContext();

  const [formState, setFormState] = useState<FieldEditorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: field ? true : undefined,
    submit: field
      ? async () => ({ isValid: true, data: field })
      : async () => ({ isValid: false, data: {} as Field }),
  });

  const [modalVisibility, setModalVisibility] = useState(defaultModalVisibility);
  const [isFormModified, setIsFormModified] = useState(false);

  const { submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;

  const canCloseValidator = useCallback(() => {
    if (isFormModified) {
      setModalVisibility({
        ...defaultModalVisibility,
        confirmUnsavedChanges: true,
      });
    }
    return !isFormModified;
  }, [isFormModified]);

  const onClickSave = useCallback(async () => {
    const { isValid, data } = await submit();

    if (!isMounted.current) {
      // User has closed the flyout meanwhile submitting the form
      return;
    }

    if (isValid) {
      const nameChange = field?.name !== data.name;
      const typeChange = field?.type !== data.type;

      if (isEditingExistingField && (nameChange || typeChange)) {
        setModalVisibility({
          ...defaultModalVisibility,
          confirmChangeNameOrType: true,
        });
      } else {
        onSave(data);
      }
    }
  }, [onSave, submit, field, isEditingExistingField]);

  const onClickCancel = useCallback(() => {
    const canClose = canCloseValidator();

    if (canClose) {
      onCancel();
    }
  }, [onCancel, canCloseValidator]);

  const renderModal = () => {
    if (modalVisibility.confirmChangeNameOrType) {
      return (
        <SaveFieldTypeOrNameChangedModal
          fieldName={field?.name!}
          onConfirm={async () => {
            const { data } = await submit();
            onSave(data);
          }}
          onCancel={() => {
            setModalVisibility(defaultModalVisibility);
          }}
        />
      );
    }

    if (modalVisibility.confirmUnsavedChanges) {
      return (
        <ModifiedFieldModal
          onConfirm={() => {
            setModalVisibility(defaultModalVisibility);
            onCancel();
          }}
          onCancel={() => {
            setModalVisibility(defaultModalVisibility);
          }}
        />
      );
    }

    return null;
  };

  useEffect(() => {
    if (onMounted) {
      // When the flyout mounts we send to the parent the validator to check
      // if we can close the flyout or not (and display a confirm modal if needed).
      // This is required to display the confirm modal when clicking outside the flyout.
      onMounted({ canCloseValidator });

      return () => {
        onMounted({ canCloseValidator: () => true });
      };
    }
  }, [onMounted, canCloseValidator]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <>
      <FlyoutPanels.Group
        flyoutClassName={euiFlyoutClassname}
        maxWidth={1180}
        data-test-subj="fieldEditor"
        fixedPanelWidths
      >
        {/* Editor panel */}
        <FlyoutPanels.Item width={600}>
          <FlyoutPanels.Content>
            <FlyoutPanels.Header>
              <EuiTitle data-test-subj="flyoutTitle">
                <h2>
                  {field ? (
                    <FormattedMessage
                      id="indexPatternFieldEditor.editor.flyoutEditFieldTitle"
                      defaultMessage="Edit field '{fieldName}'"
                      values={{
                        fieldName: field.name,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="indexPatternFieldEditor.editor.flyoutDefaultTitle"
                      defaultMessage="Create field"
                    />
                  )}
                </h2>
              </EuiTitle>
              <EuiText color="subdued">
                <p>
                  <FormattedMessage
                    id="indexPatternFieldEditor.editor.flyoutEditFieldSubtitle"
                    defaultMessage="Data view: {patternName}"
                    values={{
                      patternName: <i>{dataView.title}</i>,
                    }}
                  />
                </p>
              </EuiText>
            </FlyoutPanels.Header>

            <FieldEditor
              field={field}
              onChange={setFormState}
              onFormModifiedChange={setIsFormModified}
            />
          </FlyoutPanels.Content>

          <FlyoutPanels.Footer>
            <>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    flush="left"
                    onClick={onClickCancel}
                    data-test-subj="closeFlyoutButton"
                  >
                    {i18nTexts.cancelButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="primary"
                    onClick={onClickSave}
                    data-test-subj="fieldSaveButton"
                    fill
                    disabled={hasErrors}
                    isLoading={isSavingField || isSubmitting}
                  >
                    {i18nTexts.saveButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          </FlyoutPanels.Footer>
        </FlyoutPanels.Item>

        {/* Preview panel */}
        {isPanelVisible && (
          <FlyoutPanels.Item
            width={440}
            backgroundColor="euiPageBackground"
            border="left"
            data-test-subj="previewPanel"
          >
            <FieldPreview />
          </FlyoutPanels.Item>
        )}
      </FlyoutPanels.Group>

      {renderModal()}
    </>
  );
};

export const FieldEditorFlyoutContent = React.memo(FieldEditorFlyoutContentComponent);
