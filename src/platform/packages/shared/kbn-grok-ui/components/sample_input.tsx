/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CodeEditorProps, CodeEditor } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import React, { useEffect, useMemo, useRef } from 'react';
import { combineLatest } from 'rxjs';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { debounce } from 'lodash';
import { DraftGrokExpression, GrokCollection } from '../models';
import { semanticNameLabel, patternNameLabel, typeNameLabel } from './constants';
import { colourToClassName } from './utils';

// For displaying multiline samples (one line per sample) with live user input and highlighting
export const SampleInput = ({
  grokCollection,
  draftGrokExpressions,
  sample = '',
  readOnly = false,
  onChangeSample,
  height = '150px',
}: {
  grokCollection: GrokCollection;
  draftGrokExpressions: DraftGrokExpression[];
  sample: string;
  readOnly?: boolean;
  onChangeSample?: (sample: string) => void;
  height?: CodeEditorProps['height'];
}) => {
  const eui = useEuiTheme();

  const debouncedProcessExpressions = useMemo(() => debounce(processExpressions, 300), []);

  const sampleEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const sampleEditorDecorationsCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const onSampleEditorMount: CodeEditorProps['editorDidMount'] = (editor) => {
    sampleEditorRef.current = editor;
    sampleEditorDecorationsCollectionRef.current = editor.createDecorationsCollection();
  };

  // Monaco doesn't support dynamic inline styles, so we need to generate static styles.
  const colourPaletteStyles = useMemo(() => {
    return grokCollection.getColourPaletteStyles();
  }, [grokCollection]);

  useEffect(() => {
    const subscription = combineLatest(
      draftGrokExpressions.map((draft) => draft.getExpression$())
    ).subscribe(() => {
      debouncedProcessExpressions(
        draftGrokExpressions,
        sampleEditorRef,
        sampleEditorDecorationsCollectionRef
      );
    });
    return () => subscription.unsubscribe();
  }, [debouncedProcessExpressions, draftGrokExpressions]);

  useEffect(() => {
    debouncedProcessExpressions(
      draftGrokExpressions,
      sampleEditorRef,
      sampleEditorDecorationsCollectionRef
    );
  }, [sample, debouncedProcessExpressions, draftGrokExpressions]);

  return (
    <>
      <div
        css={css`
          .grok-pattern-match {
            background-color: ${eui.euiTheme.colors.highlight};
          }
          ${colourPaletteStyles}
        `}
      >
        <CodeEditor
          languageId="plaintext"
          value={sample}
          height={height}
          editorDidMount={onSampleEditorMount}
          onChange={onChangeSample}
          options={{ readOnly }}
        />
      </div>
    </>
  );
};

const processExpressions = (
  draftGrokExpressions: DraftGrokExpression[],
  sampleEditorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
  sampleEditorDecorationsCollectionRef: React.MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
) => {
  const model = sampleEditorRef.current?.getModel();
  const fullSamples = model?.getValue();

  // We're only interested in the first expression that has matches.
  // Grok allows defining multiple patterns, but only the first matching one is relevant.
  // Perform a cheap check first.
  for (const expression of draftGrokExpressions) {
    const regexp = expression.getRegex();
    if (regexp) {
      const result = fullSamples?.match(regexp);
      if (result !== null) {
        // We found a match, so we can stop looking for other expressions.
        processExpression(expression, sampleEditorRef, sampleEditorDecorationsCollectionRef);
        break;
      }
    }
  }
};
const processExpression = (
  draftGrokExpression: DraftGrokExpression,
  sampleEditorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
  sampleEditorDecorationsCollectionRef: React.MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
) => {
  if (!sampleEditorRef.current) {
    return;
  }

  const regexpPatternSource = draftGrokExpression.getRegex();
  const fields = draftGrokExpression.getFields();
  const model = sampleEditorRef.current?.getModel();
  const lineCount = model?.getLineCount() ?? 0;

  // Overall (continuous) match ranges
  const overallMatchRanges: monaco.Range[] = [];
  const captureGroupDecorations: monaco.editor.IModelDeltaDecoration[] = [];
  const outputResult: Array<Record<string, string | number>> = [];

  for (let i = 1; i <= lineCount; i++) {
    const line = model?.getLineContent(i) ?? '';

    // Parse can handle multiple lines of samples, but we'll go line by line to share the line content lookup.
    const parsed = draftGrokExpression.parse([line]);
    outputResult.push(parsed[0]);

    if (regexpPatternSource) {
      const regexpPattern = new RegExp(
        regexpPatternSource.source,
        // d flag is added to allow for indices tracking
        regexpPatternSource.flags + 'd'
      );

      // We expect one match per line (we are not using global matches / flags) or none
      const match = line.match(regexpPattern);

      // Overall continuous match highlight
      if (match && match.length > 0) {
        const matchingText = match[0];
        const startIndex = match.index;

        if (startIndex !== undefined) {
          const endIndex = startIndex + matchingText.length + 1;
          const matchRange = new monaco.Range(i, startIndex, i, endIndex);
          overallMatchRanges.push(matchRange);
        }
      }

      // Semantic (field name) match highlights
      const matchGroupResults = regexpPattern.exec(line);
      if (matchGroupResults && matchGroupResults.indices && matchGroupResults.indices.groups) {
        for (const [key, value] of Object.entries(matchGroupResults.indices.groups)) {
          const fieldDefinition = fields.get(key);
          if (value && fieldDefinition) {
            const [startIndex, endIndex] = value;
            const decorationRange = new monaco.Range(i, startIndex + 1, i, endIndex + 1);
            captureGroupDecorations.push({
              range: decorationRange,
              options: {
                inlineClassName: colourToClassName(fieldDefinition?.colour),
                hoverMessage: [
                  { value: `${semanticNameLabel} ${fieldDefinition.name}` },
                  {
                    value: `${patternNameLabel} ${fieldDefinition.pattern}`,
                    supportHtml: true,
                  },
                  ...(fieldDefinition.type
                    ? [{ value: `${typeNameLabel} ${fieldDefinition.type}` }]
                    : []),
                ],
              },
            });
          }
        }
      }
    }
  }

  const overallMatchDecorations: monaco.editor.IModelDeltaDecoration[] = overallMatchRanges.map(
    (range) => {
      return {
        range,
        options: {
          inlineClassName: 'grok-pattern-match',
        },
      };
    }
  );

  sampleEditorDecorationsCollectionRef.current?.clear();
  sampleEditorDecorationsCollectionRef.current?.set(
    overallMatchDecorations.concat(captureGroupDecorations)
  );
};
