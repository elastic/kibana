/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AdjustedParsedRequest } from '../../types';
import { containsComments } from './comments';
import { indentData } from './formatter';
import { splitRequestDataObjects } from './splitter';
import { collapseTripleQuoteStrings, expandTripleQuoteStrings } from './triple_quotes';

const cleanUpWhitespaces = (line: string): string => {
  return line.trim().replaceAll(/\s+/g, ' ');
};

const getIndentedRequestDataLines = (dataLines: string[]): string[] => {
  const dataString = dataLines.join('\n');
  const dataJsons = splitRequestDataObjects(dataString);

  return dataJsons.map((data) => {
    // Since triple-quote strings are not valid JSON syntax, collapse them before indenting.
    const { collapsedTripleQuotesData, tripleQuoteStrings } = collapseTripleQuoteStrings(data);
    const indentedData = indentData(collapsedTripleQuotesData);
    return expandTripleQuoteStrings(indentedData, tripleQuoteStrings);
  });
};

const getFormattedRequestLines = (
  request: AdjustedParsedRequest,
  allTextLines: string[],
  addToastWarning: (text: string) => void
): string[] => {
  const requestLines = allTextLines.slice(request.startLineNumber - 1, request.endLineNumber);
  const firstLine = cleanUpWhitespaces(requestLines[0]);
  const dataLines = requestLines.slice(1);

  if (containsComments(dataLines.join(''))) {
    addToastWarning(
      i18n.translate('console.notification.monaco.warning.nonSupportedAutoindentation', {
        defaultMessage:
          'Auto-indentation is currently not supported for requests containing comments. Please remove comments to enable formatting.',
      })
    );
    return [firstLine, ...dataLines];
  }

  return requestLines.length > 1
    ? [firstLine, ...getIndentedRequestDataLines(dataLines)]
    : [firstLine];
};

const formatSelectedTextLines = (
  requests: AdjustedParsedRequest[],
  selectedTextLines: string[],
  allTextLines: string[],
  addToastWarning: (text: string) => void
): string[] => {
  const formattedTextLines: string[] = [];
  let requestIndex = 0;

  for (let lineIndex = 0; lineIndex < selectedTextLines.length; lineIndex++) {
    const request = requests[requestIndex];
    const selectedLine = selectedTextLines[lineIndex];

    if (!request || selectedLine !== allTextLines[request.startLineNumber - 1]) {
      formattedTextLines.push(cleanUpWhitespaces(selectedLine));
      continue;
    }

    formattedTextLines.push(...getFormattedRequestLines(request, allTextLines, addToastWarning));
    lineIndex += request.endLineNumber - request.startLineNumber;
    requestIndex++;
  }

  return formattedTextLines;
};

/**
 * This function takes a string containing unformatted Console requests and
 * returns a text in which the requests are auto-indented.
 * @param requests The list of {@link AdjustedParsedRequest} that are in the selected text in the editor.
 * @param selectedText The selected text in the editor.
 * @param allText The whole text input in the editor.
 */
export const getAutoIndentedRequests = (
  requests: AdjustedParsedRequest[],
  selectedText: string,
  allText: string,
  addToastWarning: (text: string) => void
): string => {
  const selectedTextLines = selectedText.split(`\n`);
  const allTextLines = allText.split(`\n`);
  return formatSelectedTextLines(requests, selectedTextLines, allTextLines, addToastWarning).join(
    '\n'
  );
};
