/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiConfirmModal,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

import type { Field, EsRuntimeField } from '../types';
import { RuntimeFieldPainlessError } from '../lib';
import { euiFlyoutMaxWidth, euiFlyoutClassname } from '../constants';
import { Flyout } from './flyout_panels';
import { useFieldEditorContext } from './field_editor_context';
import type { Props as FieldEditorProps, FieldEditorFormState } from './field_editor/field_editor';
import { FieldPreview } from './preview';

const geti18nTexts = (field?: Field) => {
  return {
    closeButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
    saveButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutSaveButtonLabel', {
      defaultMessage: 'Save',
    }),
    formErrorsCalloutTitle: i18n.translate('indexPatternFieldEditor.editor.validationErrorTitle', {
      defaultMessage: 'Fix errors in form before continuing.',
    }),
    cancelButtonText: i18n.translate(
      'indexPatternFieldEditor.saveRuntimeField.confirmationModal.cancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    ),
    confirmButtonText: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmationModal.saveButtonLabel',
      {
        defaultMessage: 'Save changes',
      }
    ),
    warningChangingFields: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmModal.warningChangingFields',
      {
        defaultMessage:
          'Changing name or type can break searches and visualizations that rely on this field.',
      }
    ),
    typeConfirm: i18n.translate(
      'indexPatternFieldEditor.saveRuntimeField.confirmModal.typeConfirm',
      {
        defaultMessage: 'Enter CHANGE to continue',
      }
    ),
    titleConfirmChanges: i18n.translate(
      'indexPatternFieldEditor.saveRuntimeField.confirmModal.title',
      {
        defaultMessage: `Save changes to '{name}'`,
        values: {
          name: field?.name,
        },
      }
    ),
  };
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
  /**
   * The Field editor component that contains the form to create or edit a field
   */
  FieldEditor: React.ComponentType<FieldEditorProps> | null;
  /** Handler to validate the script  */
  runtimeFieldValidator: (field: EsRuntimeField) => Promise<RuntimeFieldPainlessError | null>;
  /** Optional field to process */
  field?: Field;
  isSavingField: boolean;
}

const FieldEditorFlyoutContentComponent = ({
  field,
  onSave,
  onCancel,
  FieldEditor,
  runtimeFieldValidator,
  isSavingField,
}: Props) => {
  const isEditingExistingField = !!field;
  const i18nTexts = geti18nTexts(field);
  const { indexPattern } = useFieldEditorContext();

  const [formState, setFormState] = useState<FieldEditorFormState>({
    isSubmitted: false,
    isValid: field ? true : undefined,
    submit: field
      ? async () => ({ isValid: true, data: field })
      : async () => ({ isValid: false, data: {} as Field }),
  });

  const [painlessSyntaxError, setPainlessSyntaxError] = useState<RuntimeFieldPainlessError | null>(
    null
  );

  const [isValidating, setIsValidating] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [confirmContent, setConfirmContent] = useState<string>('');

  const { submit, isValid: isFormValid, isSubmitted } = formState;
  const hasErrors = isFormValid === false || painlessSyntaxError !== null;

  const clearSyntaxError = useCallback(() => setPainlessSyntaxError(null), []);

  const syntaxError = useMemo(
    () => ({
      error: painlessSyntaxError,
      clear: clearSyntaxError,
    }),
    [painlessSyntaxError, clearSyntaxError]
  );

  const onClickSave = useCallback(async () => {
    const { isValid, data } = await submit();
    const nameChange = field?.name !== data.name;
    const typeChange = field?.type !== data.type;

    if (isValid) {
      if (data.script) {
        setIsValidating(true);

        const error = await runtimeFieldValidator({
          type: data.type,
          script: data.script,
        });

        setIsValidating(false);
        setPainlessSyntaxError(error);

        if (error) {
          return;
        }
      }

      if (isEditingExistingField && (nameChange || typeChange)) {
        setIsModalVisible(true);
      } else {
        onSave(data);
      }
    }
  }, [onSave, submit, runtimeFieldValidator, field, isEditingExistingField]);

  const modal = isModalVisible ? (
    <EuiConfirmModal
      title={i18nTexts.titleConfirmChanges}
      data-test-subj="runtimeFieldSaveConfirmModal"
      cancelButtonText={i18nTexts.cancelButtonText}
      confirmButtonText={i18nTexts.confirmButtonText}
      confirmButtonDisabled={confirmContent?.toUpperCase() !== 'CHANGE'}
      onCancel={() => {
        setIsModalVisible(false);
        setConfirmContent('');
      }}
      onConfirm={async () => {
        const { data } = await submit();
        onSave(data);
      }}
    >
      <EuiCallOut
        color="warning"
        title={i18nTexts.warningChangingFields}
        iconType="alert"
        size="s"
      />
      <EuiSpacer />
      <EuiFormRow label={i18nTexts.typeConfirm}>
        <EuiFieldText
          value={confirmContent}
          onChange={(e) => setConfirmContent(e.target.value)}
          data-test-subj="saveModalConfirmText"
        />
      </EuiFormRow>
    </EuiConfirmModal>
  ) : null;

  return (
    <>
      {FieldEditor && (
        <Flyout.Panels flyoutClassName={euiFlyoutClassname} maxWidth={euiFlyoutMaxWidth}>
          {/* Editor panel */}
          <Flyout.Panel width={60} withFooter>
            <Flyout.Header>
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
                    defaultMessage="Index pattern: {patternName}"
                    values={{
                      patternName: <i>{indexPattern.title}</i>,
                    }}
                  />
                </p>
              </EuiText>
            </Flyout.Header>

            <FieldEditor field={field} onChange={setFormState} syntaxError={syntaxError} />

            <Flyout.Footer>
              <>
                {isSubmitted && hasErrors && (
                  <>
                    <EuiCallOut
                      title={i18nTexts.formErrorsCalloutTitle}
                      color="danger"
                      iconType="cross"
                      data-test-subj="formError"
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="cross"
                      flush="left"
                      onClick={onCancel}
                      data-test-subj="closeFlyoutButton"
                    >
                      {i18nTexts.closeButtonLabel}
                    </EuiButtonEmpty>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="primary"
                      onClick={onClickSave}
                      data-test-subj="fieldSaveButton"
                      fill
                      disabled={hasErrors}
                      isLoading={isSavingField || isValidating}
                    >
                      {i18nTexts.saveButtonLabel}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            </Flyout.Footer>
          </Flyout.Panel>

          {/* Preview panel */}
          <Flyout.Panel width={40} backgroundColor="euiColorLightestShade">
            <FieldPreview />
          </Flyout.Panel>
        </Flyout.Panels>
      )}

      {modal}
    </>
  );
};

export const FieldEditorFlyoutContent = React.memo(FieldEditorFlyoutContentComponent);
