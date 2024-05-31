/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// We want to allow both right-clicking to open in a new tab and clicking through
// the "Open in Console" link. We could use `RedirectAppLinks` at the top level
// but that inserts a div which messes up the layout of the inspector.

import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import React, { ReactNode } from 'react';
import { CodeEditor } from '@kbn/code-editor';

interface RequestCodeViewerProps {
  value: string;
  actions?: Array<{ name: string; action: ReactNode }>;
}

const copyToClipboardLabel = i18n.translate('inspector.requests.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

/**
 * @internal
 */
export const RequestCodeViewer = ({ value, actions }: RequestCodeViewerProps) => {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      wrap={false}
      responsive={false}
      className="insRequestCodeViewer"
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <div>
              <EuiCopy textToCopy={value}>
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
          {!!actions &&
            actions.map((item) => (
              <EuiFlexItem grow={false} key={item.name}>
                <div>{item.action}</div>
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true} data-test-subj="inspectorRequestCodeViewerContainer">
        <CodeEditor
          languageId={XJsonLang.ID}
          value={value}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            folding: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
