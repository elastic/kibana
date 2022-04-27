/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiPanel, EuiTitle, EuiLink, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { monaco as monacoEditor } from '@kbn/monaco';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import type { VisParams } from '../../types';

import './script.scss';
import { KIBANA_API_CONSTANT_NAME } from '../../renderer';

const provideSuggestions = (
  model: monacoEditor.editor.ITextModel,
  position: monacoEditor.Position,
  context: monacoEditor.languages.CompletionContext
): monacoEditor.languages.ProviderResult<monacoEditor.languages.CompletionList> => {
  const suggestions: monacoEditor.languages.CompletionList['suggestions'] = [];

  if (context.triggerCharacter === 'K') {
    const wordRange = new monacoEditor.Range(
      position.lineNumber,
      position.column - 1,
      position.lineNumber,
      position.column
    );

    suggestions.push({
      label: KIBANA_API_CONSTANT_NAME,
      kind: monacoEditor.languages.CompletionItemKind.Constant,
      documentation: {
        value: 'Used to access select Kibana APIs (like querying Elasticsearch)',
        isTrusted: true,
      },
      insertText: KIBANA_API_CONSTANT_NAME,
      range: wordRange,
    });
  }

  if (
    context.triggerCharacter === '.' &&
    model.getWordAtPosition({
      lineNumber: position.lineNumber,
      column: position.column - 2,
    })?.word === KIBANA_API_CONSTANT_NAME
  ) {
    const wordRange = new monacoEditor.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );

    suggestions.push(
      {
        label: 'searchEs',
        kind: monacoEditor.languages.CompletionItemKind.Method,
        documentation: {
          value: 'Runs an Elasticsearch query',
          isTrusted: true,
        },
        insertText: 'searchEs({\n\tquery: {\n\t\t$0\n\t}\n})',
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: wordRange,
      },
      {
        label: 'subscribeToResize',
        kind: monacoEditor.languages.CompletionItemKind.Method,
        documentation: {
          value: 'Registers a function to be called when vis gets resized',
          isTrusted: true,
        },
        insertText: 'subscribeToResize(() => {$0})',
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: wordRange,
      },
      {
        label: 'getWindowDimensions',
        kind: monacoEditor.languages.CompletionItemKind.Method,
        documentation: {
          value: 'Gets the visualization dimentsions',
          isTrusted: true,
        },
        insertText: 'getWindowDimensions()',
        range: wordRange,
      }
    );
  }

  return {
    suggestions,
  };
};

function ScriptOptions({ stateParams, setValue }: VisEditorOptionsProps<VisParams>) {
  const onScriptUpdate = useCallback((value: string) => setValue('script', value), [setValue]);

  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup direction="column" gutterSize="m" className="scriptEditor">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  <label htmlFor="scriptVisInput">Script</label>
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiLink
                  href="https://help.github.com/articles/github-flavored-markdown/"
                  target="_blank"
                >
                  <FormattedMessage
                    id="visTypeMarkdown.params.helpLinkLabel"
                    defaultMessage="Help"
                  />
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          {/* TODO - CodeEditor should respect dark mode */}
          <CodeEditor
            languageId="javascript"
            value={stateParams.script}
            onChange={onScriptUpdate}
            suggestionProvider={{
              triggerCharacters: ['K', '.'],
              provideCompletionItems: provideSuggestions,
            }}
            editorDidMount={(editor) => editor.focus()}
            fullWidth={true}
            data-test-subj="scriptTextarea"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export { ScriptOptions };
