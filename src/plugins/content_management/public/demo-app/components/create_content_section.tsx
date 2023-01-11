/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';
import {
  EuiButton,
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

export const CreateContentSection: FC = () => {
  const [title, setContentType] = useState('');
  const [description, setContentId] = useState('');

  const createContent = () => {
    const content = { title, description };
    console.log(content);
  };

  return (
    <>
      <EuiTitle>
        <h2>Create</h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiDescribedFormGroup
        title={<h3>Create a new content</h3>}
        description={
          <p>
            Create a new <EuiCode>memory</EuiCode> type content
          </p>
        }
      >
        <EuiFormRow label="Title" helpText="The content title" fullWidth>
          <EuiFieldText
            value={title}
            onChange={(e) => {
              setContentType(e.currentTarget.value);
            }}
            fullWidth
          />
        </EuiFormRow>

        <EuiFormRow
          label="Description"
          helpText="Some detailed information for this content"
          fullWidth
        >
          <EuiFieldText
            value={description}
            onChange={(e) => {
              setContentId(e.currentTarget.value);
            }}
            fullWidth
          />
        </EuiFormRow>

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton color="primary" onClick={createContent}>
              Send
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescribedFormGroup>
    </>
  );
};
