/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as React from 'react';
import { monaco } from '@kbn/monaco';
import { CodeEditor, Props as CodeEditorProps } from '../code_editor/code_editor';
import { LANG } from './constants';

monaco.languages.setMonarchTokensProvider(LANG, {
  tokenizer: {
    root: [[/\{\{[^\}]+\}\}/, 'comment']],
  },
});
monaco.languages.register({ id: LANG });
export interface UrlTemplateEditorProps {
  value: string;
  height?: CodeEditorProps['height'];
  onChange: CodeEditorProps['onChange'];
}

export const UrlTemplateEditor: React.FC<UrlTemplateEditorProps> = ({
  height = 200,
  value,
  onChange,
}) => {
  React.useEffect(() => {
    const { dispose } = monaco.languages.registerCompletionItemProvider(LANG, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: [
            {
              label: 'LABEL',
              kind: monaco.languages.CompletionItemKind.Text,
              documentation: 'DOCUMENTATION TEXT',
              insertText: 'INSERT_TEXT',
              range,
            },
          ],
        };
      },
    });

    return () => {
      dispose();
    };
  }, []);

  return (
    <CodeEditor
      languageId={LANG}
      height={height}
      value={value}
      onChange={onChange}
      options={{
        minimap: {
          enabled: false,
        },
      }}
    />
  );
};
