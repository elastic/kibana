/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiFormRow, EuiFieldText, EuiTextArea, EuiSpacer } from '@elastic/eui';

import type { MetadataFormState } from './use_metadata_form';

interface Props {
  form: MetadataFormState;
  isReadonly: boolean;
}

export const MetadataForm: FC<Props> = ({ form, isReadonly }) => {
  const { title, setTitle, description, setDescription } = form;

  return (
    <>
      <EuiFormRow
        label="Name"
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
          data-test-subj="input"
          readOnly={isReadonly}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiFormRow
        label="Description"
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
          data-test-subj="input"
          readOnly={isReadonly}
        />
      </EuiFormRow>
    </>
  );
};
