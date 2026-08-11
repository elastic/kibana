/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, stringify as stringifyHjson } from 'hjson';
import { containsComments } from './comments';
import { collapseTripleQuoteStrings, expandTripleQuoteStrings } from './triple_quotes';
import {
  decodeStringToken,
  getRequestDataSemanticTokens,
  getRequestDataTokens,
  isCommentToken,
  type RequestDataToken,
} from './tokens';

interface CommaMove {
  readonly commentStart: number;
  readonly commaIndex: number;
}

const getCommentTokens = (requestData: string): string[] => {
  return getRequestDataTokens(requestData)
    .filter(isCommentToken)
    .map(({ value }) => value);
};

const hasSameValues = (first: string[], second: string[]): boolean => {
  return first.length === second.length && first.every((value, index) => value === second[index]);
};

const preservesComments = (source: string, formatted: string): boolean => {
  return hasSameValues(getCommentTokens(source), getCommentTokens(formatted));
};

const getSemanticTokens = (requestData: string): string[] => {
  return getRequestDataSemanticTokens(requestData)
    .filter((token) => !token.startsWith('//') && !token.startsWith('/*') && !token.startsWith('#'))
    .map((token) => {
      if (!token.startsWith('"') && !token.startsWith("'")) {
        return token;
      }

      const decoded = decodeStringToken(token);
      return decoded === undefined ? `raw:${token}` : `string:${JSON.stringify(decoded)}`;
    });
};

const preservesSemanticTokens = (source: string, formatted: string): boolean => {
  return hasSameValues(getSemanticTokens(source), getSemanticTokens(formatted));
};

const isFirstCommentInGroup = (
  tokens: RequestDataToken[],
  index: number,
  requestData: string
): boolean => {
  const previousToken = tokens[index - 1];
  return (
    !previousToken ||
    !isCommentToken(previousToken) ||
    !/^\s*$/.test(requestData.slice(previousToken.end, tokens[index].start))
  );
};

const getCommentGroupEnd = (
  tokens: RequestDataToken[],
  startIndex: number,
  requestData: string
): number => {
  let end = tokens[startIndex].end;

  for (const token of tokens.slice(startIndex + 1)) {
    if (!isCommentToken(token) || !/^\s*$/.test(requestData.slice(end, token.start))) {
      return end;
    }
    end = token.end;
  }

  return end;
};

const getCommaIndexAfter = (requestData: string, offset: number): number | undefined => {
  const comma = requestData.slice(offset).match(/^(\s*),/);
  return comma ? offset + comma[1].length : undefined;
};

const getCommaMoves = (requestData: string): CommaMove[] => {
  const tokens = getRequestDataTokens(requestData);

  return tokens.flatMap((token, index) => {
    if (!isCommentToken(token) || !isFirstCommentInGroup(tokens, index, requestData)) {
      return [];
    }

    const commentEnd = getCommentGroupEnd(tokens, index, requestData);
    const commaIndex = getCommaIndexAfter(requestData, commentEnd);

    return commaIndex === undefined ? [] : [{ commentStart: token.start, commaIndex }];
  });
};

const INDENT_UNIT = '  ';

const isClosingPunctuation = (character: string | undefined): boolean => {
  return character === '}' || character === ']';
};

interface CommentLineMetadata {
  readonly isCommentOnly: boolean;
  readonly isReindentable: boolean;
}

const getCommentLineMetadata = (
  formattedData: string,
  lines: string[],
  commentTokens: RequestDataToken[]
): CommentLineMetadata[] => {
  let firstCommentIndex = 0;
  let lineStart = 0;

  return lines.map((line) => {
    const currentLineStart = lineStart;
    const lineEnd = currentLineStart + line.length;
    lineStart = lineEnd + 1;

    while (commentTokens[firstCommentIndex]?.end <= currentLineStart) {
      firstCommentIndex += 1;
    }

    let cursor = currentLineStart;
    let tokenIndex = firstCommentIndex;
    let hasComment = false;
    let hasMultiLineComment = false;

    while (commentTokens[tokenIndex]?.start < lineEnd) {
      const token = commentTokens[tokenIndex];
      const commentStart = Math.max(currentLineStart, token.start);
      const commentEnd = Math.min(lineEnd, token.end);

      if (formattedData.slice(cursor, commentStart).trim()) {
        return { isCommentOnly: false, isReindentable: false };
      }

      hasComment = true;
      hasMultiLineComment ||= token.start < currentLineStart || token.end > lineEnd;
      cursor = Math.max(cursor, commentEnd);
      tokenIndex += 1;
    }

    const isCommentOnly = hasComment && !formattedData.slice(cursor, lineEnd).trim();
    return {
      isCommentOnly,
      isReindentable: isCommentOnly && !hasMultiLineComment,
    };
  });
};

const reindentCommentLines = (lines: string[], commentLines: CommentLineMetadata[]): string[] => {
  const reindentedLines = [...lines];
  let nextCodeIndent: string | undefined;

  for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = lines[lineIndex];
    const content = line.trimStart();

    if (!content) {
      continue;
    }
    if (commentLines[lineIndex].isCommentOnly) {
      if (commentLines[lineIndex].isReindentable && nextCodeIndent !== undefined) {
        reindentedLines[lineIndex] = nextCodeIndent + content;
      }
      continue;
    }

    const indent = line.slice(0, line.length - content.length);
    nextCodeIndent = isClosingPunctuation(content[0]) ? indent + INDENT_UNIT : indent;
  }

  return reindentedLines;
};

/**
 * Re-indents comment-only lines to the depth of the code they precede, matching
 * common formatter conventions. Hjson emits comments with their original leading
 * whitespace, which detaches them from the re-indented structure around them.
 * Only leading whitespace changes, so comment token values stay intact for the
 * preservation guards. Multi-line block comments are left untouched because
 * shifting their inner lines would change their token values.
 */
const reindentStandaloneComments = (formattedData: string): string => {
  const commentTokens = getRequestDataTokens(formattedData).filter(isCommentToken);
  if (commentTokens.length === 0) {
    return formattedData;
  }

  const lines = formattedData.split('\n');
  const commentLines = getCommentLineMetadata(formattedData, lines, commentTokens);

  return reindentCommentLines(lines, commentLines).join('\n');
};

const moveCommasBeforeComments = (requestData: string): string => {
  const moves = getCommaMoves(requestData);
  if (moves.length === 0) {
    return requestData;
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const { commentStart, commaIndex } of moves) {
    parts.push(
      requestData.slice(cursor, commentStart),
      ',',
      requestData.slice(commentStart, commaIndex)
    );
    cursor = commaIndex + 1;
  }

  parts.push(requestData.slice(cursor));
  return parts.join('');
};

const indentData = (
  dataString: string,
  { preserveComments = false }: { preserveComments?: boolean } = {}
): string => {
  try {
    if (!preserveComments) {
      return JSON.stringify(parse(dataString), null, 2);
    }

    const parsedData = parse(moveCommasBeforeComments(dataString), { keepWsc: true });
    const formattedData = reindentStandaloneComments(
      stringifyHjson(parsedData, {
        keepWsc: true,
        space: 2,
        quotes: 'all',
        separator: true,
        bracesSameLine: true,
      })
    );

    return preservesComments(dataString, formattedData) &&
      preservesSemanticTokens(dataString, formattedData)
      ? formattedData
      : dataString;
  } catch {
    return dataString;
  }
};

export const formatRequestData = (data: string): string => {
  const { collapsedTripleQuotesData, tripleQuoteStrings, marker } =
    collapseTripleQuoteStrings(data);
  const indentedData = indentData(collapsedTripleQuotesData, {
    preserveComments: containsComments(data),
  });

  return expandTripleQuoteStrings(indentedData, tripleQuoteStrings, marker);
};
