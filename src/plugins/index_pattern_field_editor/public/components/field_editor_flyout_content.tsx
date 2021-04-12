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
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
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

import { DocLinksStart, CoreStart } from 'src/core/public';

import { Field, InternalFieldType, PluginStart, EsRuntimeField } from '../types';
import { getLinks, RuntimeFieldPainlessError } from '../lib';
import type { IndexPattern, DataPublicPluginStart } from '../shared_imports';
import type { Props as FieldEditorProps, FieldEditorFormState } from './field_editor/field_editor';

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
   * The docLinks start service from core
   */
  docLinks: DocLinksStart;
  /**
   * The Field editor component that contains the form to create or edit a field
   */
  FieldEditor: React.ComponentType<FieldEditorProps> | null;
  /** The internal field type we are dealing with (concrete|runtime)*/
  fieldTypeToProcess: InternalFieldType;
  /** Handler to validate the script  */
  runtimeFieldValidator: (field: EsRuntimeField) => Promise<RuntimeFieldPainlessError | null>;
  /** Optional field to process */
  field?: Field;

  indexPattern: IndexPattern;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  uiSettings: CoreStart['uiSettings'];
  isSavingField: boolean;
}

const FieldEditorFlyoutContentComponent = ({
  field,
  onSave,
  onCancel,
  FieldEditor,
  docLinks,
  indexPattern,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
  fieldTypeToProcess,
  runtimeFieldValidator,
  isSavingField,
}: Props) => {
  const isEditingExistingField = !!field;
  const i18nTexts = geti18nTexts(field);

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
  const { fields } = indexPattern;
  const isSaveButtonDisabled = isFormValid === false || painlessSyntaxError !== null;

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

  const namesNotAllowed = useMemo(() => fields.map((fld) => fld.name), [fields]);

  const existingConcreteFields = useMemo(() => {
    const existing: Array<{ name: string; type: string }> = [];

    fields
      .filter((fld) => {
        const isFieldBeingEdited = field?.name === fld.name;
        return !isFieldBeingEdited && fld.isMapped;
      })
      .forEach((fld) => {
        existing.push({
          name: fld.name,
          type: (fld.esTypes && fld.esTypes[0]) || '',
        });
      });

    return existing;
  }, [fields, field]);

  const ctx = useMemo(
    () => ({
      fieldTypeToProcess,
      namesNotAllowed,
      existingConcreteFields,
    }),
    [fieldTypeToProcess, namesNotAllowed, existingConcreteFields]
  );

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
      <EuiFlyoutHeader>
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {FieldEditor && (
          <FieldEditor
            indexPattern={indexPattern}
            fieldFormatEditors={fieldFormatEditors}
            fieldFormats={fieldFormats}
            uiSettings={uiSettings}
            links={getLinks(docLinks)}
            field={field}
            onChange={setFormState}
            ctx={ctx}
            syntaxError={syntaxError}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {FieldEditor && (
          <>
            {isSubmitted && isSaveButtonDisabled && (
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
                  disabled={isSaveButtonDisabled}
                  isLoading={isSavingField || isValidating}
                >
                  {i18nTexts.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutFooter>
      {modal}
    </>
  );
};

export const FieldEditorFlyoutContent = React.memo(FieldEditorFlyoutContentComponent);
