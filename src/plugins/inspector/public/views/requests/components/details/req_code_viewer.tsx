/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiCopy, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { CodeEditor } from '../../../../../../kibana_react/public';

interface RequestCodeViewerProps {
  json: string;
}

const copyToClipboardLabel = i18n.translate('inspector.requests.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

/**
 * @internal
 */
export const RequestCodeViewer = ({ json }: RequestCodeViewerProps) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    wrap={false}
    responsive={false}
    className="insRequestCodeViewer"
  >
    <EuiFlexItem grow={false}>
      <EuiSpacer size="s" />
      <div className="eui-textRight">
        <EuiCopy textToCopy={json}>
          {(copy) => (
            <EuiButtonEmpty
              size="xs"
              flush="right"
              iconType="copyClipboard"
              onClick={copy}
              data-test-subj="inspectorRequestCopyClipboardButton"
            >
              {copyToClipboardLabel}
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </div>
    </EuiFlexItem>
    <EuiFlexItem grow={true}>
      <CodeEditor
        languageId="json"
        value={json}
        onChange={() => {}}
        options={{
          readOnly: true,
          lineNumbers: 'off',
          fontSize: 12,
          minimap: {
            enabled: false,
          },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
