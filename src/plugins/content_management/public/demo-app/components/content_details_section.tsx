/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { EuiCodeEditor } from '@kbn/es-ui-shared-plugin/public';

import { useApp } from '../context';

export const ContentDetailsSection: FC = () => {
  const { rpc } = useApp();

  const [contentType, setContentType] = useState('foo');
  const [contentId, setContentId] = useState('');
  const [content, setContent] = useState<Record<string, unknown>>({});

  const isIdEmpty = contentId.trim() === '';

  useDebounce(
    () => {
      const load = async () => {
        const res = await rpc.get({ type: contentType, id: contentId });
        setContent(res as Record<string, unknown>);
      };

      if (!isIdEmpty) {
        load();
      }
    },
    500,
    [rpc, contentType, contentId, isIdEmpty]
  );

  return (
    <>
      <EuiTitle>
        <h2>Content details</h2>
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
          <EuiCodeEditor
            value={JSON.stringify(content, null, 4)}
            width="100%"
            height="500px"
            mode="json"
            readOnly
            wrapEnabled
            showPrintMargin={false}
            theme="textmate"
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              tabSize: 2,
              useSoftTabs: true,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
