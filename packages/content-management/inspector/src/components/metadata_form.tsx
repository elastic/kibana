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
}

export const MetadataForm: FC<Props> = ({ form }) => {
  const { errors, title, setTitle, description, setDescription } = form;

  return (
    <>
      <EuiFormRow
        label="Name"
        error={errors.title?.message}
        isInvalid={Boolean(errors.title)}
        fullWidth
      >
        <EuiFieldText
          isInvalid={Boolean(errors.title)}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          fullWidth
          data-test-subj="input"
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiFormRow
        label="Description"
        error={errors.description?.message}
        isInvalid={Boolean(errors.description)}
        fullWidth
      >
        <EuiTextArea
          isInvalid={Boolean(errors.description)}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          fullWidth
          data-test-subj="input"
        />
      </EuiFormRow>
    </>
  );
};
