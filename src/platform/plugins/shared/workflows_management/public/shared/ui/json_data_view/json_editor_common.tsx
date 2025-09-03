/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import {
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const codeEditorAriaLabel = i18n.translate('workflows.jsonDataView.codeEditorAriaLabel', {
  defaultMessage: 'Read only JSON view',
});
const copyToClipboardLabel = i18n.translate('workflows.jsonDataView.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

interface JsonCodeEditorCommonProps {
  jsonValue: string;
  onEditorDidMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  width?: string | number;
  height?: string | number;
  hasLineNumbers?: boolean;
  hideCopyButton?: boolean;
  enableFindAction?: boolean;
}

export const JsonCodeEditorCommon = ({
  jsonValue,
  width,
  height,
  hasLineNumbers,
  onEditorDidMount,
  hideCopyButton,
  enableFindAction,
}: JsonCodeEditorCommonProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    monaco.editor.defineTheme('workflows-subdued', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': euiTheme.colors.backgroundBaseSubdued,
      },
    });
  }, [euiTheme]);

  if (jsonValue === '') {
    return null;
  }

  const codeEditor = (
    <CodeEditor
      languageId="json"
      width={width}
      height={height}
      value={jsonValue || ''}
      editorDidMount={onEditorDidMount}
      aria-label={codeEditorAriaLabel}
      options={{
        theme: 'workflows-subdued',
        automaticLayout: true,
        fontSize: 12,
        // prevent line numbers margin from being too wide
        lineNumbersMinChars: hasLineNumbers ? 2 : 0,
        lineNumbers: hasLineNumbers ? 'on' : 'off',
        minimap: {
          enabled: false,
        },
        overviewRulerBorder: false,
        readOnly: true,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
      }}
      enableFindAction={enableFindAction}
    />
  );
  if (hideCopyButton) {
    return codeEditor;
  }
  return (
    <EuiFlexGroup css={styles.codeEditor} direction="column" gutterSize="s">
      <EuiFlexItem grow={false} css={styles.copyButtonContainer}>
        <EuiCopy textToCopy={jsonValue}>
          {(copy) => (
            <EuiButtonEmpty size="xs" flush="right" iconType="copyClipboard" onClick={copy}>
              {copyToClipboardLabel}
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem>{codeEditor}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const JSONCodeEditorCommonMemoized = React.memo((props: JsonCodeEditorCommonProps) => {
  return <JsonCodeEditorCommon {...props} />;
});

const componentStyles = {
  codeEditor: ({ euiTheme }: UseEuiTheme) => css`
    height: 100%;
    padding: 0 ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.s};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
  `,
  copyButtonContainer: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${euiTheme.size.m} ${euiTheme.size.m} 0 0;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    z-index: 2;
  `,
};
