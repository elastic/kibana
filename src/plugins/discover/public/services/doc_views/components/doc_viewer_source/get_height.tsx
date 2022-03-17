/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { monaco } from '@kbn/monaco';
import { MARGIN_BOTTOM, MAX_LINES_CLASSIC_TABLE } from './source';

export function getHeight(editor: monaco.editor.IStandaloneCodeEditor, useDocExplorer: boolean) {
  const editorElement = editor?.getDomNode();
  if (!editorElement) {
    return 0;
  }

  let result;
  if (useDocExplorer) {
    // assign a good height filling the available space of the document flyout
    const position = editorElement.getBoundingClientRect();
    result = window.innerHeight - position.top - MARGIN_BOTTOM;
  } else {
    // takes care of the classic table, display a maximum of 500 lines
    // why not display it all? Due to performance issues when the browser needs to render it all
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const lineCount = editor.getModel()?.getLineCount() || 1;
    const displayedLineCount =
      lineCount > MAX_LINES_CLASSIC_TABLE ? MAX_LINES_CLASSIC_TABLE : lineCount;
    result = editor.getTopForLineNumber(displayedLineCount + 1) + lineHeight;
  }
  return result > 0 ? result : 0;
}
