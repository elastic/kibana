/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

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
  'data-test-subj'?: string;
}

export const JsonCodeEditorCommon = ({
  jsonValue,
  width,
  height,
  hasLineNumbers,
  onEditorDidMount,
  hideCopyButton,
  enableFindAction,
  'data-test-subj': dataTestSubj,
}: JsonCodeEditorCommonProps) => {
  const styles = useMemoCss(componentStyles);
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
        // Limitation: it's not possible to use different themes for different code editors in the same page, so the same theme as the workflow yaml editor is used.
        theme: WORKFLOWS_MONACO_EDITOR_THEME,
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
    <EuiFlexGroup
      css={styles.codeEditor}
      direction="column"
      gutterSize="s"
      data-test-subj={dataTestSubj}
    >
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
