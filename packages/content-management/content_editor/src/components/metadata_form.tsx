/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  EuiToolTip,
} from '@elastic/eui';

import { ContentEditorFlyoutWarningsCallOut } from './editor_flyout_warnings';
import type { Field, MetadataFormState } from './use_metadata_form';
import type { SavedObjectsReference, Services } from '../services';

interface Props {
  form: MetadataFormState & {
    isSubmitted: boolean;
  };
  isReadonly: boolean;
  readonlyReason: string;
  tagsReferences: SavedObjectsReference[];
  TagList?: Services['TagList'];
  TagSelector?: Services['TagSelector'];
}

const isFormFieldValid = (field: Field) => !Boolean(field.errors?.length);

export const MetadataForm: FC<Props> = ({
  form,
  tagsReferences,
  TagList,
  TagSelector,
  isReadonly,
  readonlyReason,
  children,
}) => {
  const {
    title,
    setTitle,
    description,
    setDescription,
    tags,
    setTags,
    isSubmitted,
    isValid,
    getErrors,
    getWarnings,
  } = form;

  return (
    <EuiForm isInvalid={isSubmitted && !isValid} error={getErrors()} data-test-subj="metadataForm">
      <ContentEditorFlyoutWarningsCallOut warningMessages={getWarnings()} />

      <EuiFormRow
        label={i18n.translate('contentManagement.contentEditor.metadataForm.nameInputLabel', {
          defaultMessage: 'Name',
        })}
        error={title.errors}
        isInvalid={!isFormFieldValid(title)}
        fullWidth
      >
        <EuiToolTip
          position="top"
          content={isReadonly ? readonlyReason : undefined}
          display="block"
        >
          <EuiFieldText
            isInvalid={!isFormFieldValid(title)}
            value={title.value}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            fullWidth
            data-test-subj="nameInput"
            readOnly={isReadonly}
          />
        </EuiToolTip>
      </EuiFormRow>

      <EuiSpacer />

      <EuiFormRow
        label={i18n.translate(
          'contentManagement.contentEditor.metadataForm.descriptionInputLabel',
          {
            defaultMessage: 'Description',
          }
        )}
        error={description.errors}
        isInvalid={!isFormFieldValid(description)}
        fullWidth
      >
        <EuiToolTip
          position="top"
          content={isReadonly ? readonlyReason : undefined}
          display="block"
        >
          <EuiTextArea
            isInvalid={!isFormFieldValid(description)}
            value={description.value}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            fullWidth
            data-test-subj="descriptionInput"
            readOnly={isReadonly}
          />
        </EuiToolTip>
      </EuiFormRow>

      {TagList && isReadonly && tagsReferences.length > 0 && (
        <>
          <EuiSpacer />
          <EuiFormRow
            label={i18n.translate('contentManagement.contentEditor.metadataForm.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            fullWidth
          >
            <TagList references={tagsReferences} />
          </EuiFormRow>
        </>
      )}

      {TagSelector && !isReadonly && (
        <>
          <EuiSpacer />
          <TagSelector initialSelection={tags.value} onTagsSelected={setTags} fullWidth />
        </>
      )}

      {children && (
        <>
          <EuiSpacer />
          {children}
        </>
      )}
    </EuiForm>
  );
};
