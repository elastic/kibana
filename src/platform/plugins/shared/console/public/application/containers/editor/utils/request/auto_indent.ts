/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AdjustedParsedRequest } from '../../types';
import { formatRequestData } from './formatter';
import { splitRequestDataObjects } from './splitter';

export interface AutoIndentResult {
  readonly text: string;
  readonly hasCommentFallback: boolean;
}

interface FormattedRequestLinesResult {
  readonly lines: string[];
  readonly hasCommentFallback: boolean;
}

const cleanUpWhitespaces = (line: string): string => {
  return line.trim().replaceAll(/\s+/g, ' ');
};

const getFormattedRequestLines = (
  request: AdjustedParsedRequest,
  allTextLines: string[]
): FormattedRequestLinesResult => {
  const requestLines = allTextLines.slice(request.startLineNumber - 1, request.endLineNumber);
  const data = requestLines.slice(1).join('\n');
  const formattedData = splitRequestDataObjects(data).map(formatRequestData);

  return {
    lines: [cleanUpWhitespaces(requestLines[0]), ...formattedData.map(({ text }) => text)],
    hasCommentFallback: formattedData.some(({ status }) => status === 'commentFallback'),
  };
};

const formatSelectedTextLines = (
  selectedTextLines: string[],
  allTextLines: string[],
  requests: AdjustedParsedRequest[]
): FormattedRequestLinesResult => {
  const formattedTextLines: string[] = [];
  let hasCommentFallback = false;
  let requestIndex = 0;

  for (let lineIndex = 0; lineIndex < selectedTextLines.length; lineIndex += 1) {
    const line = selectedTextLines[lineIndex];
    const request = requests[requestIndex];
    if (!request || line !== allTextLines[request.startLineNumber - 1]) {
      formattedTextLines.push(cleanUpWhitespaces(line));
      continue;
    }

    const formattedRequest = getFormattedRequestLines(request, allTextLines);
    formattedTextLines.push(...formattedRequest.lines);
    hasCommentFallback ||= formattedRequest.hasCommentFallback;
    lineIndex += request.endLineNumber - request.startLineNumber;
    requestIndex += 1;
  }

  return { lines: formattedTextLines, hasCommentFallback };
};

/**
 * Formats the selected Console requests while preserving lines between them.
 */
export const getAutoIndentedRequests = (
  requests: AdjustedParsedRequest[],
  selectedText: string,
  allText: string
): AutoIndentResult => {
  const { lines, hasCommentFallback } = formatSelectedTextLines(
    selectedText.split('\n'),
    allText.split('\n'),
    requests
  );

  return { text: lines.join('\n'), hasCommentFallback };
};
