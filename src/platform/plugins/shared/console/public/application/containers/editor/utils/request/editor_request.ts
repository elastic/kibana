/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco, ParsedRequest } from '@kbn/monaco';
import { createInsideConsoleStringChecker } from '@kbn/monaco/src/languages/console/utils';
import type { EditorRequest } from '../../types';
import { startsWithMethodRegex } from '../constants';
import { parseLine } from '../tokens_utils';
import { splitRequestDataObjects } from './splitter';

/*
 * This function converts the start offset value of the parsed request to a line number in the model
 */
export const getRequestStartLineNumber = (
  parsedRequest: ParsedRequest,
  model: monaco.editor.ITextModel
): number => {
  return model.getPositionAt(parsedRequest.startOffset).lineNumber;
};

/*
 * This function converts the end offset value of the parsed request to a line number in the model.
 * If there is no end offset (the parser was not able to parse this request completely),
 * then the last non-empty line is returned or the line before the next request.
 */
export const getRequestEndLineNumber = ({
  parsedRequest,
  nextRequest,
  model,
  startLineNumber,
}: {
  parsedRequest: ParsedRequest;
  nextRequest?: ParsedRequest;
  model: monaco.editor.ITextModel;
  startLineNumber: number;
}): number => {
  let endLineNumber: number;

  if (parsedRequest.endOffset) {
    // if the parser set an end offset for this request, then find the line number for it
    endLineNumber = model.getPositionAt(parsedRequest.endOffset).lineNumber;
  } else {
    const requestStartLineNumber = model.getPositionAt(parsedRequest.startOffset).lineNumber;

    // if no end offset, try to find the line before the next request starts
    if (nextRequest) {
      const nextRequestStartLine = model.getPositionAt(nextRequest.startOffset).lineNumber;
      endLineNumber =
        nextRequestStartLine > startLineNumber ? nextRequestStartLine - 1 : startLineNumber;
    } else {
      // if there is no next request, find the end of the text or the line that starts with a method
      const lineCount = model.getLineCount();
      // The parser reads the request line as method + url and never opens a string on it, so the
      // string scan starts at the body: a stray quote or comment marker on the request line must
      // not phase-shift the string state of the lines below.
      const bodyLines: string[] = [];
      for (let lineNumber = requestStartLineNumber + 1; lineNumber <= lineCount; lineNumber++) {
        bodyLines.push(model.getLineContent(lineNumber));
      }
      // Scan the body once and query each candidate line by offset; rescanning the whole prefix
      // for every method-like line is quadratic on large unfinished bodies.
      const isInsideUnfinishedString = createInsideConsoleStringChecker(bodyLines.join('\n'));
      let nextLineNumber = requestStartLineNumber + 1;
      let nextLineStartOffset = 0;
      while (nextLineNumber <= lineCount) {
        const nextLineContent = bodyLines[nextLineNumber - requestStartLineNumber - 1];
        if (
          nextLineContent.trim().match(startsWithMethodRegex) &&
          !isInsideUnfinishedString(nextLineStartOffset)
        ) {
          // found a line that starts with a method, stop iterating
          break;
        }
        nextLineStartOffset += nextLineContent.length + 1;
        nextLineNumber++;
      }
      // nextLineNumber is now either the line with a method or 1 line after the end of the text
      // set the end line for this request to the line before nextLineNumber
      endLineNumber = nextLineNumber > startLineNumber ? nextLineNumber - 1 : startLineNumber;
    }
  }
  // if the end line is empty, go up to find the first non-empty line
  let lineContent = model.getLineContent(endLineNumber).trim();
  while (!lineContent) {
    endLineNumber = endLineNumber - 1;
    lineContent = model.getLineContent(endLineNumber).trim();
  }
  return endLineNumber;
};

/*
 * This function extracts a normalized method and url from the editor and
 * the "raw" text of the request body without any changes to it. The only normalization
 * for request body is to split several json objects into an array of strings.
 */
export const getRequestFromEditor = (
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number
): EditorRequest | null => {
  const methodUrlLine = model.getLineContent(startLineNumber).trim();
  if (!methodUrlLine) {
    return null;
  }
  const { method, url } = parseLine(methodUrlLine, false);
  if (!method || !url) {
    return null;
  }
  const upperCaseMethod = method.toUpperCase();

  if (endLineNumber <= startLineNumber) {
    return { method: upperCaseMethod, url, data: [] };
  }
  const dataString = model
    .getValueInRange({
      startLineNumber: startLineNumber + 1,
      startColumn: 1,
      endLineNumber,
      endColumn: model.getLineMaxColumn(endLineNumber),
    })
    .trim();
  const data = splitRequestDataObjects(dataString);

  return { method: upperCaseMethod, url, data };
};
