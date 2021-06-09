/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './json_code_editor.scss';

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { monaco, XJsonLang } from '@kbn/monaco';
import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '../../../../../kibana_react/public';

const codeEditorAriaLabel = i18n.translate('discover.json.codeEditorAriaLabel', {
  defaultMessage: 'Read only JSON view of an elasticsearch document',
});
const copyToClipboardLabel = i18n.translate('discover.json.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

interface JsonCodeEditorProps {
  json: Record<string, unknown>;
  width?: string | number;
  hasLineNumbers?: boolean;
}

export const JsonCodeEditor = ({ json, width, hasLineNumbers }: JsonCodeEditorProps) => {
  const jsonValue = JSON.stringify(json, null, 2);

  // setting editor height based on lines height and count to stretch and fit its content
  const setEditorCalculatedHeight = useCallback((editor) => {
    const editorElement = editor.getDomNode();

    if (!editorElement) {
      return;
    }

    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const lineCount = editor.getModel()?.getLineCount() || 1;
    const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight;

    editorElement.style.height = `${height}px`;
    editor.layout();
  }, []);

  return (
    <EuiFlexGroup className="dscJsonCodeEditor" direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiSpacer size="s" />
        <div className="eui-textRight">
          <EuiCopy textToCopy={jsonValue}>
            {(copy) => (
              <EuiButtonEmpty size="xs" flush="right" iconType="copyClipboard" onClick={copy}>
                {copyToClipboardLabel}
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        <CodeEditor
          languageId={XJsonLang.ID}
          width={width}
          value={jsonValue}
          onChange={() => {}}
          editorDidMount={setEditorCalculatedHeight}
          aria-label={codeEditorAriaLabel}
          options={{
            automaticLayout: true,
            fontSize: 12,
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
