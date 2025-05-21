/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { euiFlyoutClassname } from '../constants';
import type { Field } from '../types';
import { PreviewState } from './preview/types';
import { ModifiedFieldModal, SaveFieldTypeOrNameChangedModal } from './confirm_modals';

import { FieldEditor, FieldEditorFormState } from './field_editor/field_editor';
import { useFieldEditorContext } from './field_editor_context';
import { FlyoutPanels } from './flyout_panels';
import { FieldPreview, useFieldPreviewContext } from './preview';
import { useStateSelector } from '../state_utils';

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
  fieldToEdit?: Field;
  /** Optional preselected configuration for new field */
  fieldToCreate?: Field;
  /** Handler to call when the component mounts.
   *  We will pass "up" data that the parent component might need
   */
  onMounted?: (args: { canCloseValidator: () => boolean }) => void;
}

const isPanelVisibleSelector = (state: PreviewState) => state.isPanelVisible;
const isSavingSelector = (state: PreviewState) => state.isSaving;

const FieldEditorFlyoutContentComponent = ({
  fieldToEdit,
  fieldToCreate,
  onSave,
  onCancel,
  onMounted,
}: Props) => {
  const isMounted = useRef(false);
  const isEditingExistingField = !!fieldToEdit;
  const { dataView, subfields$ } = useFieldEditorContext();

  const isMobile = useIsWithinMaxBreakpoint('s');

  const { controller } = useFieldPreviewContext();
  const isPanelVisible = useStateSelector(controller.state$, isPanelVisibleSelector);
  const isSavingField = useStateSelector(controller.state$, isSavingSelector);

  const [formState, setFormState] = useState<FieldEditorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: fieldToEdit ? true : undefined,
    submit: fieldToEdit
      ? async () => ({ isValid: true, data: fieldToEdit })
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
    const { isValid, data: updatedField } = await submit();

    if (!isMounted.current) {
      // User has closed the flyout meanwhile submitting the form
      return;
    }

    if (isValid) {
      const nameChange = fieldToEdit?.name !== updatedField.name;
      const typeChange = fieldToEdit?.type !== updatedField.type;

      if (isEditingExistingField && (nameChange || typeChange)) {
        setModalVisibility({
          ...defaultModalVisibility,
          confirmChangeNameOrType: true,
        });
      } else {
        if (updatedField.type === 'composite') {
          onSave({ ...updatedField, fields: subfields$.getValue() });
        } else {
          onSave(updatedField);
        }
      }
    }
  }, [onSave, submit, fieldToEdit, isEditingExistingField, subfields$]);

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
          fieldName={fieldToEdit?.name!}
          onConfirm={async () => {
            const { data: updatedField } = await submit();
            if (updatedField.type === 'composite') {
              onSave({ ...updatedField, fields: subfields$.getValue() });
            } else {
              onSave(updatedField);
            }
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
        maxWidth={isMobile ? false : 1180}
        data-test-subj="fieldEditor"
        fixedPanelWidths
      >
        {/* Editor panel */}
        <FlyoutPanels.Item width={600}>
          <FlyoutPanels.Content>
            <FlyoutPanels.Header>
              <EuiTitle data-test-subj="flyoutTitle">
                <h2>
                  {fieldToEdit ? (
                    <FormattedMessage
                      id="indexPatternFieldEditor.editor.flyoutEditFieldTitle"
                      defaultMessage="Edit field ''{fieldName}''"
                      values={{
                        fieldName: fieldToEdit.name,
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
                      patternName: <i>{dataView.getName()}</i>,
                    }}
                  />
                </p>
              </EuiText>
            </FlyoutPanels.Header>

            <FieldEditor
              field={fieldToEdit ?? fieldToCreate}
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
