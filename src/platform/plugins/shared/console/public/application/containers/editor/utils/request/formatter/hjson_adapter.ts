/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, stringify as stringifyHjson } from 'hjson';
import {
  getRequestDataScannerTokens,
  getRequestDataTokens,
  isCommentToken,
  type RequestDataToken,
} from '../tokens';

interface CommaMove {
  readonly commentStart: number;
  readonly commaIndex: number;
}

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

interface HjsonCommentMetadata {
  c?: Record<string, [string, string]>;
  a?: Array<[string, string]>;
  // Hjson keeps an end-slot on every container under keepWsc. A blank slot is still truthy,
  // so stringify expands empty []/{} to multi-line; drop blanks so empty containers stay compact.
  e?: [string] | [string, string];
}

interface HjsonCommentHolder {
  __COMMENTS__?: unknown;
}

const getHjsonCommentMetadata = (value: object): HjsonCommentMetadata | undefined => {
  const metadata = (value as HjsonCommentHolder).__COMMENTS__;
  return metadata && typeof metadata === 'object' ? (metadata as HjsonCommentMetadata) : undefined;
};

interface CommentTokenTrieNode {
  readonly children: Map<string, CommentTokenTrieNode>;
  match?: {
    readonly textLength: number;
    readonly newline: string;
  };
}

const createCommentTokenTrie = (commentTokens: RequestDataToken[]): CommentTokenTrieNode => {
  const root: CommentTokenTrieNode = { children: new Map() };

  for (const token of commentTokens) {
    const newlineMatch = token.value.match(/\r?\n$/);
    const text = newlineMatch ? token.value.slice(0, -newlineMatch[0].length) : token.value;
    let node = root;

    for (const character of text) {
      let child = node.children.get(character);
      if (!child) {
        child = { children: new Map() };
        node.children.set(character, child);
      }
      node = child;
    }

    node.match ??= {
      textLength: text.length,
      newline: newlineMatch ? newlineMatch[0] : '\n',
    };
  }

  return root;
};

const getLongestCommentTokenMatch = (
  text: string,
  trie: CommentTokenTrieNode
): CommentTokenTrieNode['match'] => {
  let node = trie;
  let bestMatch = node.match;

  for (const character of text) {
    const child = node.children.get(character);
    if (!child) {
      break;
    }
    node = child;
    bestMatch = node.match ?? bestMatch;
  }

  return bestMatch;
};

const repairCommentPair = (
  pair: [string, string] | undefined,
  commentTokenTrie: CommentTokenTrieNode
): void => {
  if (!pair?.[1]) {
    return;
  }

  // Hjson 3.2.2 consumes only the LF of a CRLF around comments, leaving bare CR remnants
  // (e.g. "\r// hello"). A CR-leading comment makes stringify insert a hardcoded LF, producing
  // mixed EOLs and blank lines that the LF twin of the same input does not have. Stripping the
  // remnants restores the LF-equivalent comment text; formatCommentLayout() re-applies the
  // document EOL to the final output.
  let commentText = pair[1].replace(/\r(?!\n)/g, '');
  const leadingSpacesMatch = commentText.match(/^[^\S\r\n]*/);
  const leadingLength = leadingSpacesMatch ? leadingSpacesMatch[0].length : 0;
  const contentStart = commentText.slice(leadingLength);
  const bestMatch = getLongestCommentTokenMatch(contentStart, commentTokenTrie);

  if (bestMatch) {
    const afterIndex = leadingLength + bestMatch.textLength;
    if (
      afterIndex < commentText.length &&
      commentText[afterIndex] !== '\n' &&
      commentText[afterIndex] !== '\r'
    ) {
      commentText =
        commentText.slice(0, afterIndex) + bestMatch.newline + commentText.slice(afterIndex);
    }
  }

  pair[1] = commentText;
};

const repairAstComments = (value: unknown, commentTokenTrie: CommentTokenTrieNode): void => {
  if (!value || typeof value !== 'object') {
    return;
  }

  const comments = getHjsonCommentMetadata(value);
  if (comments?.c) {
    for (const key of Object.keys(comments.c)) {
      repairCommentPair(comments.c[key], commentTokenTrie);
    }
  }
  if (comments?.a) {
    for (let index = 0; index < comments.a.length; index += 1) {
      repairCommentPair(comments.a[index], commentTokenTrie);
    }
  }
  if (comments?.e) {
    // End slots are `[before]` (sometimes a pair); only index 0 is emitted by stringify.
    comments.e[0] = comments.e[0]?.replace(/\r(?!\n)/g, '') ?? '';
    if (!comments.e[0].trim()) {
      delete comments.e;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      repairAstComments(item, commentTokenTrie);
    }
  } else {
    for (const key of Object.keys(value)) {
      repairAstComments((value as Record<string, unknown>)[key], commentTokenTrie);
    }
  }
};

export const formatWithHjson = (dataString: string, eol: string): string => {
  const commentTokenTrie = createCommentTokenTrie(
    getRequestDataScannerTokens(dataString).filter(isCommentToken)
  );
  const parsedData = parse(moveCommasBeforeComments(dataString), { keepWsc: true });
  repairAstComments(parsedData, commentTokenTrie);

  return stringifyHjson(parsedData, {
    keepWsc: true,
    eol,
    space: 2,
    quotes: 'all',
    separator: true,
    bracesSameLine: true,
  });
};
