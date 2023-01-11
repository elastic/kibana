/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useState } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { ContentPreview } from './content_preview';

export const ContentPreviewSection: FC = () => {
  const [contentType, setContentType] = useState('elastic');
  const [contentId, setContentId] = useState('123');

  return (
    <>
      <EuiTitle>
        <h2>Content preview</h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Type" helpText="The content type" fullWidth>
            <EuiFieldText
              value={contentType}
              onChange={(e) => {
                setContentType(e.currentTarget.value);
              }}
              fullWidth
            />
          </EuiFormRow>

          <EuiFormRow label="Id" helpText="The content id" fullWidth>
            <EuiFieldText
              value={contentId}
              onChange={(e) => {
                setContentId(e.currentTarget.value);
              }}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentPreview type={contentType} id={contentId} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
