/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: implement

export type TokenKind = 'backtick' | 'markdown-link';

export type ClassifyResult =
  | { kind: 'skip'; reason: string }
  | {
      kind: 'validate';
      anchor: 'repo-root' | 'file' | 'declared-base';
      token: string;
      declaredBase?: string;
    };

export interface ExtractedToken {
  line: number;
  token: string;
  tokenKind: TokenKind;
  rawLine: string;
}

// Stub — always returns skip until implemented
export function classifyToken(
  _token: string,
  _tokenKind: TokenKind,
  _rawLine: string,
  _fileContent: string
): ClassifyResult {
  return { kind: 'skip', reason: 'not-implemented' };
}

// Stub — returns empty array until implemented
export function extractPaths(_fileContent: string): ExtractedToken[] {
  return [];
}
