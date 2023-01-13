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
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { KibanaContent } from '../../../common';
import { useApp } from '../context';

export const CreateContentSection: FC = () => {
  const [title, setContentType] = useState('');
  const [description, setContentId] = useState('');
  const [contentCreated, setContentCreated] = useState<KibanaContent | null>(null);

  const { rpc } = useApp();

  const createContent = async () => {
    const content = { title, description };

    setContentCreated(null);
    const created = await rpc.create({ type: 'foo', data: content });
    setContentCreated(created as any);
  };

  return (
    <>
      <EuiTitle>
        <h2>Create</h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiDescribedFormGroup
        title={<h3>Create a new content</h3>}
        style={{ maxWidth: '100%' }}
        description={
          <p>
            Create a new <EuiCode>foo</EuiCode> type content. This content is persisted in memory.
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
        <EuiSpacer />

        {contentCreated !== null && (
          <>
            <EuiCallOut title="Content created!" color="success" iconType="package">
              <EuiCodeBlock isCopyable>{contentCreated.id}</EuiCodeBlock>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

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
