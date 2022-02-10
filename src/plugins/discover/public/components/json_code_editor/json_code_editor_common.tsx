/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './json_code_editor.scss';

import React from 'react';
import { i18n } from '@kbn/i18n';
import { monaco, XJsonLang } from '@kbn/monaco';
import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '../../../../kibana_react/public';

const codeEditorAriaLabel = i18n.translate('discover.json.codeEditorAriaLabel', {
  defaultMessage: 'Read only JSON view of an elasticsearch document',
});
const copyToClipboardLabel = i18n.translate('discover.json.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

interface JsonCodeEditorCommonProps {
  jsonValue: string;
  onEditorDidMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  width?: string | number;
  hasLineNumbers?: boolean;
}

export const JsonCodeEditorCommon = ({
  jsonValue,
  width,
  hasLineNumbers,
  onEditorDidMount,
}: JsonCodeEditorCommonProps) => {
  if (jsonValue === '') {
    return null;
  }
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
          value={jsonValue || ''}
          editorDidMount={onEditorDidMount}
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

export const JSONCodeEditorCommonMemoized = React.memo((props: JsonCodeEditorCommonProps) => {
  return <JsonCodeEditorCommon {...props} />;
});
