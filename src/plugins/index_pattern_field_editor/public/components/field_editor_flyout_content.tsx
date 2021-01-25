/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';
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
} from '@elastic/eui';

import { DocLinksStart } from 'src/core/public';

import { IndexPatternField } from '../shared_imports';

const geti18nTexts = (field?: IndexPatternField) => {
  return {
    flyoutTitle: field
      ? i18n.translate('indexPatternFieldEditor.editor.flyoutEditFieldTitle', {
          defaultMessage: 'Edit {fieldName} field',
          values: {
            fieldName: field.name,
          },
        })
      : i18n.translate('indexPatternFieldEditor.editor.flyoutDefaultTitle', {
          defaultMessage: 'Create new field',
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
  onSave: (field: IndexPatternField) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  /**
   * The docLinks start service from core
   */
  docLinks: DocLinksStart;
  /**
   * Optional field to edit
   */
  field?: IndexPatternField;
}

export const FieldEditorFlyoutContent = ({ field, onSave, onCancel }: Props) => {
  const i18nTexts = geti18nTexts(field);

  const onClickSave = useCallback(async () => {
    // TODO: Here we'll have the logic to retrieve the field editor formData...
    const updatedField = {} as any;
    onSave(updatedField);
  }, [onSave]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="flyoutTitle">
          <h2 id="fieldEditorTitle">{i18nTexts.flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <div>Here will come the FieldEditor component.</div>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {/* {isSubmitted && !isFormValid && (
          <>
            <EuiCallOut
              title={i18nTexts.formErrorsCalloutTitle}
              color="danger"
              iconType="cross"
              data-test-subj="formError"
            />
            <EuiSpacer size="m" />
          </>
        )} */}

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
              data-test-subj="saveFieldButton"
              // disabled={isSubmitted && !isFormValid}
              fill
            >
              {i18nTexts.saveButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
