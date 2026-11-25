/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRequestDataScannerTokens, getRequestDataTokens, isCommentToken } from '../tokens';
import type { RequestDataToken } from '../tokens';

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
    let hasCommentFromPreviousLine = false;

    while (commentTokens[tokenIndex]?.start < lineEnd) {
      const token = commentTokens[tokenIndex];
      const commentStart = Math.max(currentLineStart, token.start);
      const commentEnd = Math.min(lineEnd, token.end);

      if (formattedData.slice(cursor, commentStart).trim()) {
        return { isCommentOnly: false, isReindentable: false };
      }

      hasComment = true;
      hasCommentFromPreviousLine ||= token.start < currentLineStart;
      cursor = Math.max(cursor, commentEnd);
      tokenIndex += 1;
    }

    const isCommentOnly = hasComment && !formattedData.slice(cursor, lineEnd).trim();
    return {
      isCommentOnly,
      isReindentable: isCommentOnly && !hasCommentFromPreviousLine,
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

const normalizeNewlines = (text: string, eol: string): string => {
  return text.replace(/\r\n|\r|\n/g, eol);
};

/**
 * Re-indents comment-only lines to the depth of the code they precede, matching
 * common formatter conventions. Hjson emits comments with their original leading
 * whitespace, which detaches them from the re-indented structure around them.
 * Only leading whitespace changes, so comment token values stay intact for the
 * preservation guards. For multi-line block comments, only the opening line can
 * move; continuation lines stay untouched because their indentation is part of
 * the comment token.
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

const isStandaloneComment = (requestData: string, token: RequestDataToken): boolean => {
  const lineStart = requestData.lastIndexOf('\n', token.start - 1) + 1;
  return !requestData.slice(lineStart, token.start).trim();
};

const restoreStandaloneCommentPlacement = (
  source: string,
  formatted: string,
  eol: string
): string => {
  const sourceComments = getRequestDataScannerTokens(source).filter(isCommentToken);
  const formattedComments = getRequestDataScannerTokens(formatted).filter(isCommentToken);
  if (sourceComments.length !== formattedComments.length) {
    return formatted;
  }

  const parts: string[] = [];
  let cursor = 0;

  for (let index = 0; index < sourceComments.length; index += 1) {
    const sourceComment = sourceComments[index];
    const formattedComment = formattedComments[index];
    if (
      !isStandaloneComment(source, sourceComment) ||
      isStandaloneComment(formatted, formattedComment)
    ) {
      continue;
    }

    let whitespaceStart = formattedComment.start;
    while (
      whitespaceStart > 0 &&
      (formatted[whitespaceStart - 1] === ' ' || formatted[whitespaceStart - 1] === '\t')
    ) {
      whitespaceStart -= 1;
    }
    parts.push(formatted.slice(cursor, whitespaceStart), eol);
    cursor = formattedComment.start;
  }

  parts.push(formatted.slice(cursor));
  return parts.join('');
};

export const formatCommentLayout = (source: string, formatted: string, eol: string): string => {
  return normalizeNewlines(
    reindentStandaloneComments(restoreStandaloneCommentPlacement(source, formatted, eol)),
    eol
  );
};
