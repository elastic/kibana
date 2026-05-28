/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CodeEditorProps, monaco } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useResizeChecker } from '@kbn/react-hooks';
import { DraftGrokExpression, type GrokCollection } from '../models';
import { colourToClassName } from './utils';

// Matches %{SYNTAX:SEMANTIC} and %{SYNTAX:SEMANTIC:TYPE} patterns with named capture positions
const GROK_FIELD_PATTERN_REGEX =
  /%\{[A-Z0-9_@#$%&*+=\-\.]+:([A-Za-z0-9_@#$%&*+=\-\.]+)(?::[A-Za-z]+)?\}/g;

export const Expression = ({
  grokCollection,
  pattern,
  onChange,
  height = '100px',
  dataTestSubj,
}: {
  grokCollection: GrokCollection;
  pattern: string;
  onChange?: (pattern: string) => void;
  height?: CodeEditorProps['height'];
  dataTestSubj?: string;
}) => {
  const [suggestionProvider] = useState(() => {
    return grokCollection.getSuggestionProvider();
  });

  const eui = useEuiTheme();

  const draftGrokExpression = useMemo(() => {
    return new DraftGrokExpression(grokCollection, pattern);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grokCollection]);

  // Sync pattern prop with internal DraftGrokExpression
  useEffect(() => {
    const currentExpression = draftGrokExpression.getExpression();
    if (currentExpression !== pattern) {
      draftGrokExpression.updateExpression(pattern);
    }
  }, [pattern, draftGrokExpression]);

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const { containerRef, setupResizeChecker, destroyResizeChecker } = useResizeChecker();

  const colourPaletteStyles = useMemo(() => {
    return grokCollection.getColourPaletteStyles(eui.euiTheme);
  }, [eui.euiTheme, grokCollection]);

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    grokEditorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection();
    setupResizeChecker(editor);
    updateDecorations(draftGrokExpression, grokEditorRef, decorationsRef);
  };

  const onGrokEditorWillUnmount: CodeEditorProps['editorWillUnmount'] = () => {
    destroyResizeChecker();
  };

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    draftGrokExpression.updateExpression(value);
    onChange?.(value);
    updateDecorations(draftGrokExpression, grokEditorRef, decorationsRef);
  };

  // Re-apply decorations when pattern changes externally (e.g. from form state)
  useEffect(() => {
    updateDecorations(draftGrokExpression, grokEditorRef, decorationsRef);
  }, [pattern, draftGrokExpression]);

  return (
    <div
      ref={containerRef}
      css={css`
        ${colourPaletteStyles}
      `}
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <CodeEditor
        languageId="grok"
        value={pattern}
        height={height}
        fullWidth={true}
        editorDidMount={onGrokEditorMount}
        editorWillUnmount={onGrokEditorWillUnmount}
        onChange={onGrokEditorChange}
        suggestionProvider={suggestionProvider}
        dataTestSubj={dataTestSubj}
      />
    </div>
  );
};

const updateDecorations = (
  draftGrokExpression: DraftGrokExpression,
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
  decorationsCollectionRef: React.MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
) => {
  if (!editorRef.current || !decorationsCollectionRef.current) return;

  const model = editorRef.current.getModel();
  if (!model) return;

  const fields = draftGrokExpression.getFields();
  const text = model.getValue();

  // Build field name → colour map from resolved fields
  const fieldColourMap = new Map<string, string>();
  for (const [, fieldDef] of fields) {
    if (!fieldColourMap.has(fieldDef.name)) {
      fieldColourMap.set(fieldDef.name, fieldDef.colour);
    }
  }

  const decorations: Array<{
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    options: { inlineClassName: string };
  }> = [];

  // Find all %{SYNTAX:SEMANTIC} patterns and apply colour decorations
  let match;
  GROK_FIELD_PATTERN_REGEX.lastIndex = 0;
  while ((match = GROK_FIELD_PATTERN_REGEX.exec(text)) !== null) {
    const fieldName = match[1];
    const colour = fieldColourMap.get(fieldName);
    if (colour) {
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);
      decorations.push({
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        options: {
          inlineClassName: colourToClassName(colour),
        },
      });
    }
  }

  decorationsCollectionRef.current.clear();
  decorationsCollectionRef.current.set(decorations);
};
