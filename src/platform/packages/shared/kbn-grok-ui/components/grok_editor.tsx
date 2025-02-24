/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CodeEditor, CodeEditorProps } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GrokCollection } from '../models/grok_collection_and_pattern';
import { DraftGrokExpression } from '../models/draft_grok_expression';
import { PATTERN_MAP } from '../constants/pattern_map';
interface GrokEditorProps {
  expression: string;
  onChangeExpression(expression: string): void;
  samples: string;
  onChangeSamples(samples: string): void;
  onChangeOutput?: (output: Array<Record<string, unknown> | null>) => void;
}

const samplesLabel = i18n.translate('kbn.grokUi.samplesLabel', { defaultMessage: 'Samples' });
const expressionLabel = i18n.translate('kbn.grokUi.expressionLabel', {
  defaultMessage: 'Grok expression',
});
const outputLabel = i18n.translate('kbn.grokUi.outputLabel', {
  defaultMessage: 'Output',
});

export const GrokEditor = ({
  expression,
  onChangeExpression,
  samples,
  onChangeSamples,
  onChangeOutput,
}: GrokEditorProps) => {
  const eui = useEuiTheme();

  const [grokResources] = useState<{
    collection: GrokCollection;
    draftGrokExpression: DraftGrokExpression;
    suggestionProvider: monaco.languages.CompletionItemProvider;
  }>(() => {
    const collection = new GrokCollection();
    Object.entries(PATTERN_MAP).forEach(([key, value]) => {
      collection.addPattern(key, String.raw`${value}`);
    });
    collection.resolvePatterns();
    const draftGrokExpression = new DraftGrokExpression(collection);
    const suggestionProvider = collection.getSuggestionProvider();

    return {
      collection,
      draftGrokExpression,
      suggestionProvider,
    };
  });

  const [output, setOutput] = useState<Array<Record<string, unknown> | null> | null>(null);

  // Sets background highlights for matching parts and generates structured output
  const processGrok = useCallback(() => {
    const { draftGrokExpression } = grokResources;
    draftGrokExpression.updateExpression(expression);
    const regexpPattern = draftGrokExpression.getRegex();
    const model = sampleEditorRef.current?.getModel();
    const lineCount = model?.getLineCount() ?? 0;

    const matchRanges = [];
    const outputResult = [];

    for (let i = 1; i <= lineCount; i++) {
      const line = model?.getLineContent(i) ?? '';

      // Parse can handle multiple lines of samples, but we'll go line by line to share the line content lookup.
      const parsed = draftGrokExpression.parse([line]);
      outputResult.push(parsed[0]);

      if (regexpPattern) {
        // We expect one match per line (we are not using global matches / flags) or none
        const match = line.match(regexpPattern);

        if (match && match.length > 0) {
          const matchingText = match[0];
          const startIndex = match.index;

          if (startIndex !== undefined) {
            const endIndex = startIndex + matchingText.length + 1;
            const matchRange = new monaco.Range(i, startIndex, i, endIndex);
            matchRanges.push(matchRange);
          }
        }
      }

      sampleEditorDecorationsCollection.current?.clear();
      sampleEditorDecorationsCollection.current?.set(
        matchRanges?.map((range) => {
          return {
            range,
            options: {
              inlineClassName: 'grok-pattern-match',
            },
          };
        })
      );
    }

    setOutput(outputResult);
    onChangeOutput?.(outputResult);
  }, [grokResources, expression, onChangeOutput]);

  useEffect(() => {
    processGrok();
  }, [expression, samples, processGrok]);

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const sampleEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const sampleEditorDecorationsCollection =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = (editor) => {
    grokEditorRef.current = editor;
  };

  const onSampleEditorMount: CodeEditorProps['editorDidMount'] = (editor) => {
    sampleEditorRef.current = editor;
    sampleEditorDecorationsCollection.current = editor.createDecorationsCollection();
  };

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    onChangeExpression(value);
  };

  const onSampleEditorChange: CodeEditorProps['onChange'] = (value) => {
    onChangeSamples(value);
  };

  return (
    <div
      css={css`
        .grok-pattern-match {
          background-color: ${eui.euiTheme.colors.highlight};
        }
      `}
    >
      {samplesLabel}
      <CodeEditor
        languageId="plaintext"
        value={samples}
        height="150px"
        editorDidMount={onSampleEditorMount}
        onChange={onSampleEditorChange}
      />
      {expressionLabel}
      <CodeEditor
        languageId="grok"
        value={expression}
        height="150px"
        editorDidMount={onGrokEditorMount}
        onChange={onGrokEditorChange}
        suggestionProvider={grokResources.suggestionProvider}
      />
      {outputLabel}
      <EuiCodeBlock language="json" fontSize="s" paddingSize="m" overflowHeight={150}>
        {JSON.stringify(output, null, 2)}
      </EuiCodeBlock>
    </div>
  );
};
