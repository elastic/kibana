/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow, EuiFieldText, EuiTextArea, EuiSpacer } from '@elastic/eui';

import type { MetadataFormState } from './use_metadata_form';
import type { SavedObjectsReference, Services } from '../services';

interface Props {
  form: MetadataFormState & {
    isSubmitted: boolean;
  };
  isReadonly: boolean;
  tagsReferences: SavedObjectsReference[];
  TagList?: Services['TagList'];
  TagSelector?: Services['TagSelector'];
}

export const MetadataForm: FC<Props> = ({
  form,
  tagsReferences,
  TagList,
  TagSelector,
  isReadonly,
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
  } = form;

  return (
    <EuiForm
      isInvalid={isSubmitted && isValid === false}
      error={getErrors()}
      data-test-subj="metadataForm"
    >
      <EuiFormRow
        label={i18n.translate('contentManagement.inspector.metadataForm.nameInputLabel', {
          defaultMessage: 'Name',
        })}
        error={title.errorMessage}
        isInvalid={!title.isChangingValue && !title.isValid}
        fullWidth
      >
        <EuiFieldText
          isInvalid={!title.isChangingValue && !title.isValid}
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
        label={i18n.translate('contentManagement.inspector.metadataForm.descriptionInputLabel', {
          defaultMessage: 'Description',
        })}
        error={description.errorMessage}
        isInvalid={!description.isChangingValue && !description.isValid}
        fullWidth
      >
        <EuiTextArea
          isInvalid={!description.isChangingValue && !description.isValid}
          value={description.value}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          fullWidth
          data-test-subj="descriptionInput"
          readOnly={isReadonly}
        />
      </EuiFormRow>

      {TagList && isReadonly === true && (
        <>
          <EuiSpacer />
          <EuiFormRow
            label={i18n.translate('contentManagement.inspector.metadataForm.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            fullWidth
          >
            <TagList references={tagsReferences} />
          </EuiFormRow>
        </>
      )}

      {TagSelector && isReadonly === false && (
        <>
          <EuiSpacer />
          <TagSelector initialSelection={tags.value} onTagsSelected={setTags} fullWidth />
        </>
      )}
    </EuiForm>
  );
};
