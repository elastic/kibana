/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/code-editor';

export const findTargetComment = (
  model: monaco.editor.ITextModel,
  cursorLineNumber: number
): { lineNumber: number; text: string } | null => {
  const lineContent = model.getLineContent(cursorLineNumber).trim();
  if (lineContent.startsWith('//')) {
    return { lineNumber: cursorLineNumber, text: lineContent };
  }
  return null;
};

export const insertGeneratedCode = (
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel,
  afterLineNumber: number,
  generatedText: string
): { generatedLineStart: number; generatedLineEnd: number } => {
  const code = generatedText.endsWith('\n') ? generatedText : generatedText + '\n';
  const isLastLine = afterLineNumber >= model.getLineCount();

  if (isLastLine) {
    const lineContent = model.getLineContent(afterLineNumber);
    editor.executeEdits('nl-to-esql-preview', [
      {
        range: new monaco.Range(
          afterLineNumber,
          lineContent.length + 1,
          afterLineNumber,
          lineContent.length + 1
        ),
        text: '\n' + code,
        forceMoveMarkers: true,
      },
    ]);
  } else {
    editor.executeEdits('nl-to-esql-preview', [
      {
        range: new monaco.Range(afterLineNumber + 1, 1, afterLineNumber + 1, 1),
        text: code,
        forceMoveMarkers: true,
      },
    ]);
  }

  const lineCount = code.split('\n').length - 1;
  return {
    generatedLineStart: afterLineNumber + 1,
    generatedLineEnd: afterLineNumber + lineCount,
  };
};
// Mark the comment in the query to indicate that this is the comment that will generate the code
export const markCommentInQuery = (fullText: string, commentLineNumber: number): string => {
  return fullText
    .split('\n')
    .map((line, idx) => (idx === commentLineNumber - 1 ? `>>> ${line} <<<` : line))
    .join('\n');
};

export const isModelStillValid = (
  model: monaco.editor.ITextModel | undefined,
  commentLineNumber: number
): model is monaco.editor.ITextModel => {
  if (!model || model.isDisposed()) return false;
  if (commentLineNumber > model.getLineCount()) return false;
  return model.getLineContent(commentLineNumber).trim().startsWith('//');
};
