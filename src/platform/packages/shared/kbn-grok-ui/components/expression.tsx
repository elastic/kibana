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

// Matches %{SYNTAX:SEMANTIC} and %{SYNTAX:SEMANTIC:TYPE} tokens
const GROK_FIELD_PATTERN_REGEX =
  /%\{[A-Z0-9_@#$%&*+=\-\.]+:([A-Za-z0-9_@#$%&*+=\-\.]+)(?::[A-Za-z]+)?\}/g;

export const Expression = ({
  grokCollection,
  pattern,
  patternSlotId,
  onChange,
  height = '100px',
  dataTestSubj,
}: {
  grokCollection: GrokCollection;
  pattern: string;
  /** Must match the preview draft slot for this row so field colours stay stable while typing. */
  patternSlotId?: string | number;
  onChange?: (pattern: string) => void;
  height?: CodeEditorProps['height'];
  dataTestSubj?: string;
}) => {
  const [suggestionProvider] = useState(() => {
    return grokCollection.getSuggestionProvider();
  });

  const { euiTheme } = useEuiTheme();

  const draftGrokExpression = useMemo(() => {
    return new DraftGrokExpression(grokCollection, pattern, { patternSlotId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grokCollection, patternSlotId]);

  const [editorValue, setEditorValue] = useState(pattern);
  const pendingLocalChangeRef = useRef(false);

  // Sync external pattern changes without clobbering in-progress local edits.
  useEffect(() => {
    if (pendingLocalChangeRef.current) {
      if (pattern === draftGrokExpression.getExpression()) {
        pendingLocalChangeRef.current = false;
        setEditorValue(pattern);
      }
      return;
    }
    if (draftGrokExpression.getExpression() !== pattern) {
      draftGrokExpression.updateExpression(pattern);
    }
    setEditorValue(pattern);
  }, [pattern, draftGrokExpression]);

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const { containerRef, setupResizeChecker, destroyResizeChecker } = useResizeChecker();

  // Monaco can't accept inline styles per-decoration; we pass class names via inlineClassName
  // and inject the corresponding CSS rules onto the wrapper via Emotion so the classes resolve.
  const colourPaletteStyles = useMemo(
    () => grokCollection.getColourPaletteStyles(euiTheme),
    [euiTheme, grokCollection]
  );

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    grokEditorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection();
    setupResizeChecker(editor);
    updateDecorations(draftGrokExpression, grokCollection, grokEditorRef, decorationsRef);
  };

  const onGrokEditorWillUnmount: CodeEditorProps['editorWillUnmount'] = () => {
    destroyResizeChecker();
  };

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    pendingLocalChangeRef.current = true;
    setEditorValue(value);
    draftGrokExpression.updateExpression(value);
    onChange?.(value);
    updateDecorations(draftGrokExpression, grokCollection, grokEditorRef, decorationsRef);
  };

  // Re-apply decorations when the pattern prop changes externally (e.g. form state rewrites
  // the value, or another consumer drives the editor).
  useEffect(() => {
    updateDecorations(draftGrokExpression, grokCollection, grokEditorRef, decorationsRef);
  }, [pattern, draftGrokExpression, grokCollection]);

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
        value={editorValue}
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

// Scans the editor's current text for `%{SYNTAX:field}` tokens and applies an inline class on
// each so the token background matches the colour assigned to that field by the resolved
// pattern (and by extension the preview-table highlight for the same field).
const updateDecorations = (
  draftGrokExpression: DraftGrokExpression,
  grokCollection: GrokCollection,
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
  decorationsCollectionRef: React.MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
) => {
  const editor = editorRef.current;
  const decorationsCollection = decorationsCollectionRef.current;
  if (!editor || !decorationsCollection) return;

  const model = editor.getModel();
  if (!model) return;

  const fields = draftGrokExpression.getFields();
  // Build a field name -> colour lookup from the resolved fields. Multiple capture-group ids
  // can share a field name (e.g. same field referenced from two patterns); first one wins.
  const fieldColourMap = new Map<string, string>();
  for (const [, fieldDef] of fields) {
    if (!fieldColourMap.has(fieldDef.name)) {
      fieldColourMap.set(fieldDef.name, fieldDef.colour);
    }
  }

  const text = model.getValue();
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];

  GROK_FIELD_PATTERN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = GROK_FIELD_PATTERN_REGEX.exec(text)) !== null) {
    const fieldName = match[1];
    const colour = fieldColourMap.get(fieldName) ?? grokCollection.lookupAssignedColour(fieldName);
    if (!colour) continue;

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

  decorationsCollection.clear();
  decorationsCollection.set(decorations);
};
