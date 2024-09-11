/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { MAX_LINES_CLASSIC_TABLE, MIN_HEIGHT } from './source';

// Displayed margin of the tab content to the window bottom
export const DEFAULT_MARGIN_BOTTOM = 16;

export function getTabContentAvailableHeight(
  elementRef: HTMLElement | undefined,
  decreaseAvailableHeightBy: number
): number {
  if (!elementRef) {
    return 0;
  }

  // assign a good height filling the available space of the document flyout
  const position = elementRef.getBoundingClientRect();
  return window.innerHeight - position.top - decreaseAvailableHeightBy;
}

export function getHeight(
  editor: monaco.editor.IStandaloneCodeEditor,
  useDocExplorer: boolean,
  decreaseAvailableHeightBy: number
) {
  const editorElement = editor?.getDomNode();
  if (!editorElement) {
    return 0;
  }

  let result;
  if (useDocExplorer) {
    result = getTabContentAvailableHeight(editorElement, decreaseAvailableHeightBy);
  } else {
    // takes care of the classic table, display a maximum of 500 lines
    // why not display it all? Due to performance issues when the browser needs to render it all
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const lineCount = editor.getModel()?.getLineCount() || 1;
    const displayedLineCount =
      lineCount > MAX_LINES_CLASSIC_TABLE ? MAX_LINES_CLASSIC_TABLE : lineCount;
    result = editor.getTopForLineNumber(displayedLineCount + 1) + lineHeight;
  }
  return Math.max(result, MIN_HEIGHT);
}
