/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as React from 'react';
import { monaco } from '@kbn/monaco';
import { CodeEditor, Props as CodeEditorProps } from '../code_editor/code_editor';
import { LANG } from './constants';
import { language, conf } from './language';

monaco.languages.register({
  id: LANG,
});
monaco.languages.setMonarchTokensProvider(LANG, language);
monaco.languages.setLanguageConfiguration(LANG, conf);

export interface UrlTemplateEditorVariable {
  label: string;
  title?: string;
  documentation?: string;
}
export interface UrlTemplateEditorProps {
  initialValue: string;
  height?: CodeEditorProps['height'];
  variables?: UrlTemplateEditorVariable[];
  onChange: CodeEditorProps['onChange'];
}

export const UrlTemplateEditor: React.FC<UrlTemplateEditorProps> = ({
  height = 200,
  initialValue,
  variables,
  onChange,
}) => {
  React.useEffect(() => {
    if (!variables) {
      return;
    }

    const { dispose } = monaco.languages.registerCompletionItemProvider(LANG, {
      triggerCharacters: ['{', '/', '?', '&', '='],
      provideCompletionItems(model, position, context, token) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: variables.map(({ label, title = '', documentation = '' }) => ({
            kind: monaco.languages.CompletionItemKind.Variable,
            label,
            insertText: '{{' + label + '}}',
            detail: title,
            documentation,
            range,
            sortText: label,
          })),
        };
      },
    });

    return () => {
      dispose();
    };
  }, [variables]);

  return (
    <CodeEditor
      languageId={LANG}
      height={height}
      value={initialValue}
      onChange={onChange}
      options={{
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 2,
        minimap: {
          enabled: false,
        },
      }}
    />
  );
};
