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

import React, { useEffect, useCallback, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

import { IUiSettingsClient, HttpSetup } from 'kibana/public';
import { CodeEditor, KibanaContextProvider } from '../../../../../plugins/kibana_react/public';
import { suggest, getSuggestion } from './timelion_expression_input_helpers';
import { ArgValueSuggestions } from '../services/arg_value_suggestions';
import { ITimelionFunction, TimelionFunctionArgs } from '../../common/types';

const LANGUAGE_ID = 'timelion_expression';
monacoEditor.languages.register({ id: LANGUAGE_ID });

export interface TimelionExpressionInputDependencies {
  argValueSuggestions: ArgValueSuggestions;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
}

interface TimelionExpressionInputProps {
  value: string;
  setValue(value: string): void;
}

function TimelionExpressionInput({
  argValueSuggestions,
  http,
  uiSettings,
  value,
  setValue,
}: TimelionExpressionInputProps & TimelionExpressionInputDependencies) {
  const functionList = useRef([]);

  const provideCompletionItems = useCallback(
    async (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
      const text = model.getValue();
      const wordUntil = model.getWordUntilPosition(position);
      const wordRange = new monacoEditor.Range(
        position.lineNumber,
        wordUntil.startColumn,
        position.lineNumber,
        wordUntil.endColumn
      );

      const suggestions = await suggest(
        text,
        functionList.current,
        // it's important to offset the cursor position on 1 point left
        // because of PEG parser starts the line with 0, but monaco with 1
        position.column - 1,
        argValueSuggestions
      );

      return {
        suggestions: suggestions
          ? suggestions.list.map((s: ITimelionFunction | TimelionFunctionArgs) =>
              getSuggestion(s, suggestions.type, wordRange)
            )
          : [],
      };
    },
    [argValueSuggestions]
  );

  const provideHover = useCallback(
    async (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
      const suggestions = await suggest(
        model.getValue(),
        functionList.current,
        // it's important to offset the cursor position on 1 point left
        // because of PEG parser starts the line with 0, but monaco with 1
        position.column - 1,
        argValueSuggestions
      );

      return {
        contents: suggestions
          ? suggestions.list.map((s: ITimelionFunction | TimelionFunctionArgs) => ({
              value: s.help,
            }))
          : [],
      };
    },
    [argValueSuggestions]
  );

  useEffect(() => {
    http.get('../api/timelion/functions').then(data => {
      functionList.current = data;
    });
  }, [http]);

  return (
    <KibanaContextProvider services={{ uiSettings }}>
      <EuiFormRow
        className="visEditor__timelionExpressionInput"
        fullWidth
        label={i18n.translate('timelion.vis.expressionLabel', {
          defaultMessage: 'Timelion expression',
        })}
      >
        <div className="timelionExpressionInput__editor">
          <CodeEditor
            languageId={LANGUAGE_ID}
            value={value}
            onChange={setValue}
            suggestionProvider={{
              triggerCharacters: ['.', '(', '=', ':'],
              provideCompletionItems,
            }}
            hoverProvider={{ provideHover }}
            options={{
              automaticLayout: true,
              fixedOverflowWidgets: true,
              fontSize: 16,
              scrollBeyondLastLine: false,
              quickSuggestions: true,
              minimap: {
                enabled: false,
              },
              wordBasedSuggestions: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
            }}
            languageConfiguration={{
              autoClosingPairs: [
                {
                  open: '(',
                  close: ')',
                },
              ],
            }}
          />
        </div>
      </EuiFormRow>
    </KibanaContextProvider>
  );
}

export { TimelionExpressionInput };
