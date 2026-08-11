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

const cleanUpWhitespaces = (line: string): string => {
  return line.trim().replaceAll(/\s+/g, ' ');
};

const getFormattedRequestLines = (
  request: AdjustedParsedRequest,
  allTextLines: string[]
): string[] => {
  const requestLines = allTextLines.slice(request.startLineNumber - 1, request.endLineNumber);
  const data = requestLines.slice(1).join('\n');

  return [
    cleanUpWhitespaces(requestLines[0]),
    ...splitRequestDataObjects(data).map(formatRequestData),
  ];
};

const formatSelectedTextLines = (
  selectedTextLines: string[],
  allTextLines: string[],
  requests: AdjustedParsedRequest[]
): string[] => {
  const formattedTextLines: string[] = [];
  let requestIndex = 0;

  for (let lineIndex = 0; lineIndex < selectedTextLines.length; lineIndex += 1) {
    const line = selectedTextLines[lineIndex];
    const request = requests[requestIndex];
    if (!request || line !== allTextLines[request.startLineNumber - 1]) {
      formattedTextLines.push(cleanUpWhitespaces(line));
      continue;
    }

    formattedTextLines.push(...getFormattedRequestLines(request, allTextLines));
    lineIndex += request.endLineNumber - request.startLineNumber;
    requestIndex += 1;
  }

  return formattedTextLines;
};

/**
 * Formats the selected Console requests while preserving lines between them.
 */
export const getAutoIndentedRequests = (
  requests: AdjustedParsedRequest[],
  selectedText: string,
  allText: string
): string => {
  return formatSelectedTextLines(selectedText.split('\n'), allText.split('\n'), requests).join(
    '\n'
  );
};
