/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Borrowed from @kbn/unified-doc-viewer-plugin/public/components/doc_viewer_source/get_height.tsx

import type { monaco } from '@kbn/monaco';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { JSONCodeEditorCommonMemoized } from './json_editor_common';

// Displayed margin of the tab content to the window bottom
const MIN_HEIGHT = 300;
const MARGIN_BOTTOM = 16;
const LINE_HEIGHT = 20;

export function getTabContentAvailableHeight(elementRef: HTMLElement | undefined): number {
  if (!elementRef) {
    return 0;
  }

  // assign a good height filling the available space of the document flyout
  const position = elementRef.getBoundingClientRect();
  return window.innerHeight - position.top;
}

export function getHeight(editor: monaco.editor.IStandaloneCodeEditor) {
  const editorElement = editor?.getDomNode();
  if (!editorElement) {
    return 0;
  }

  const model = editor.getModel();
  if (!model) {
    return 0;
  }
  // @ts-expect-error - _getViewModel is a private method
  const viewModel = editor._getViewModel();
  // Get visual line count (including wrapped lines)
  const lineCount = viewModel.getLineCount();
  const availableHeight = getTabContentAvailableHeight(editorElement);
  return Math.max(Math.min(lineCount * LINE_HEIGHT + MARGIN_BOTTOM, availableHeight), MIN_HEIGHT);
}

interface JsonDataCodeProps {
  json: Record<string, unknown>;
  decreaseAvailableHeightBy?: number;
}

export const JsonDataCode = ({ json, decreaseAvailableHeightBy }: JsonDataCodeProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editorHeight, setEditorHeight] = useState<number>();
  const formattedJson = useMemo(() => {
    return JSON.stringify(json, null, 2);
  }, [json]);
  // setting editor height to fill the available space of the document flyout
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const editorElement = editorRef.current.getDomNode();

    if (!editorElement) {
      return;
    }

    const height = getHeight(editorRef.current);
    if (height === 0) {
      return;
    }

    if (!formattedJson || formattedJson === '') {
      setEditorHeight(0);
    } else {
      setEditorHeight(height);
    }
  }, [formattedJson, setEditorHeight, decreaseAvailableHeightBy]);

  const setEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  return (
    <JSONCodeEditorCommonMemoized
      jsonValue={formattedJson}
      onEditorDidMount={setEditor}
      height={editorHeight}
      hasLineNumbers
      enableFindAction
    />
  );
};
