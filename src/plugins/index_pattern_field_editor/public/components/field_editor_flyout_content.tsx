/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
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
} from '@elastic/eui';

import { DocLinksStart, CoreStart } from 'src/core/public';

import { Field, InternalFieldType, PluginStart, EsRuntimeField } from '../types';
import { getLinks } from '../lib';
import type { Props as FieldEditorProps, FieldEditorFormState } from './field_editor/field_editor';
import type { IndexPattern, DataPublicPluginStart } from '../shared_imports';

const geti18nTexts = (field?: Field) => {
  return {
    flyoutTitle: field
      ? i18n.translate('indexPatternFieldEditor.editor.flyoutEditFieldTitle', {
          defaultMessage: 'Edit {fieldName} field',
          values: {
            fieldName: field.name,
          },
        })
      : i18n.translate('indexPatternFieldEditor.editor.flyoutDefaultTitle', {
          defaultMessage: 'Create field',
        }),
    closeButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
    saveButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutSaveButtonLabel', {
      defaultMessage: 'Save',
    }),
    formErrorsCalloutTitle: i18n.translate('indexPatternFieldEditor.editor.validationErrorTitle', {
      defaultMessage: 'Fix errors in form before continuing.',
    }),
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
  runtimeFieldValidator: (field: EsRuntimeField) => Promise<Record<string, any> | null>;
  /** Optional field to process */
  field?: Field;

  indexPattern: IndexPattern;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  uiSettings: CoreStart['uiSettings'];
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
}: Props) => {
  const i18nTexts = geti18nTexts(field);

  const [formState, setFormState] = useState<FieldEditorFormState>({
    isSubmitted: false,
    isValid: field ? true : undefined,
    submit: field
      ? async () => ({ isValid: true, data: field })
      : async () => ({ isValid: false, data: {} as Field }),
  });
  const { submit, isValid: isFormValid, isSubmitted } = formState;

  const onClickSave = useCallback(async () => {
    const { isValid, data } = await submit();

    if (isValid) {
      if (data.script) {
        const syntaxError = await runtimeFieldValidator({
          type: data.type,
          script: data.script,
        });

        console.log('ERROR?', syntaxError); // eslint-disable-line
      }

      onSave(data);
    }
  }, [onSave, submit, runtimeFieldValidator]);

  const namesNotAllowed = indexPattern.fields.map((fld) => fld.name);
  const existingConcreteFields = indexPattern.fields.map((fld) => ({
    name: fld.name,
    type: (fld.esTypes && fld.esTypes[0]) || '',
  }));

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="flyoutTitle">
          <h2 id="fieldEditorTitle">{i18nTexts.flyoutTitle}</h2>
        </EuiTitle>
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
            ctx={{ fieldTypeToProcess, namesNotAllowed, existingConcreteFields }}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {FieldEditor && (
          <>
            {isSubmitted && isFormValid === false && (
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
                >
                  {i18nTexts.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutFooter>
    </>
  );
};

export const FieldEditorFlyoutContent = React.memo(FieldEditorFlyoutContentComponent);
