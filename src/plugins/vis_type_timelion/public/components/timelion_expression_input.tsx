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

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { EuiFormLabel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { monaco } from '@kbn/monaco';

import { CodeEditor, useKibana } from '../../../kibana_react/public';
import { suggest, getSuggestion } from './timelion_expression_input_helpers';
import { getArgValueSuggestions } from '../helpers/arg_value_suggestions';
import { ITimelionFunction, TimelionFunctionArgs } from '../../common/types';

const LANGUAGE_ID = 'timelion_expression';
monaco.languages.register({ id: LANGUAGE_ID });

interface TimelionExpressionInputProps {
  value: string;
  setValue(value: string): void;
}

function TimelionExpressionInput({ value, setValue }: TimelionExpressionInputProps) {
  const functionList = useRef([]);
  const kibana = useKibana();
  const argValueSuggestions = useMemo(getArgValueSuggestions, []);

  const provideCompletionItems = useCallback(
    async (model: monaco.editor.ITextModel, position: monaco.Position) => {
      const text = model.getValue();
      const wordUntil = model.getWordUntilPosition(position);
      const wordRange = new monaco.Range(
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
    async (model: monaco.editor.ITextModel, position: monaco.Position) => {
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
    if (kibana.services.http) {
      kibana.services.http.get('../api/timelion/functions').then((data) => {
        functionList.current = data;
      });
    }
  }, [kibana.services.http]);

  return (
    <div className="timExpressionInput">
      <EuiFormLabel>
        <FormattedMessage id="timelion.vis.expressionLabel" defaultMessage="Timelion expression" />
      </EuiFormLabel>
      <div className="timExpressionInput__editor">
        <div className="timExpressionInput__absolute">
          <CodeEditor
            languageId={LANGUAGE_ID}
            value={value}
            onChange={setValue}
            suggestionProvider={{
              triggerCharacters: ['.', ',', '(', '=', ':'],
              provideCompletionItems,
            }}
            hoverProvider={{ provideHover }}
            options={{
              fixedOverflowWidgets: true,
              fontSize: 14,
              folding: false,
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
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
      </div>
    </div>
  );
}

export { TimelionExpressionInput };
