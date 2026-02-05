/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  EuiCallOut,
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

export const MetadataForm: FC<React.PropsWithChildren<Props>> = ({
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
      {isReadonly && (
        <>
          <EuiCallOut size="s" title={readonlyReason} iconType="info" announceOnMount={false} />
          <EuiSpacer size="l" />
        </>
      )}
      <EuiFormRow
        label={i18n.translate('contentManagement.contentEditor.metadataForm.nameInputLabel', {
          defaultMessage: 'Name',
        })}
        error={title.errors}
        isInvalid={!isFormFieldValid(title)}
        fullWidth
        isDisabled={isReadonly}
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
        isDisabled={isReadonly}
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
      </EuiFormRow>

      {TagList && isReadonly && tagsReferences.length > 0 && (
        <>
          <EuiSpacer />
          <EuiFormRow
            label={i18n.translate('contentManagement.contentEditor.metadataForm.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            fullWidth
            isDisabled={isReadonly}
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
