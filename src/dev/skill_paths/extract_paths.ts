/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

/** Repo-root prefixes: tokens starting with these are relative to the repo root. */
const REPO_ROOT_PREFIXES = [
  'x-pack/',
  'src/',
  'packages/',
  'scripts/',
  '.buildkite/',
  '.agents/',
  'docs/',
  'config/',
];

/** Characters whose presence in a token forces a skip. */
const SKIP_CHARS = ['<', '>', '*', '{', '}', '$'];

/**
 * Classify a single extracted token.
 *
 * @param token      - The raw token string (path or URL).
 * @param tokenKind  - Whether this came from a backtick span or a markdown link.
 * @param rawLine    - The full source line (used to detect the ignore marker).
 * @param fileContent- The full markdown file content (used to detect skill-path-base).
 */
export function classifyToken(
  token: string,
  tokenKind: TokenKind,
  rawLine: string,
  fileContent: string
): ClassifyResult {
  // Inline escape hatch — the whole line is intentionally excluded
  if (rawLine.includes('<!-- skill-path-ignore -->')) {
    return { kind: 'skip', reason: 'ignore-marker' };
  }

  // Skip tokens that contain template/glob/shell/braces characters
  if (SKIP_CHARS.some((c) => token.includes(c))) {
    return { kind: 'skip', reason: 'invalid-chars' };
  }
  if (token.includes('...')) {
    return { kind: 'skip', reason: 'ellipsis' };
  }

  // Skip npm/yarn/package module specifiers
  if (token.startsWith('@')) {
    return { kind: 'skip', reason: 'module-specifier' };
  }

  // Skip absolute URLs
  if (token.startsWith('http') || token.startsWith('mailto:')) {
    return { kind: 'skip', reason: 'url' };
  }

  // Skip Kibana route bases / absolute FS paths
  if (token.startsWith('/')) {
    return { kind: 'skip', reason: 'absolute-path' };
  }

  // Markdown link tokens: always anchor relative to the containing file
  if (tokenKind === 'markdown-link') {
    const stripped = token.includes('#') ? token.split('#')[0] : token;
    return { kind: 'validate', anchor: 'file', token: stripped };
  }

  // Backtick tokens: must contain a slash (otherwise it's a bare filename)
  if (!token.includes('/')) {
    return { kind: 'skip', reason: 'no-slash' };
  }

  // Backtick tokens that start with a known repo-root prefix
  if (REPO_ROOT_PREFIXES.some((prefix) => token.startsWith(prefix))) {
    return { kind: 'validate', anchor: 'repo-root', token };
  }

  // Backtick tokens in a file that declares a base path
  const baseMatch = fileContent.match(/<!--\s*skill-path-base:\s*(\S+)\s*-->/);
  if (baseMatch) {
    return { kind: 'validate', anchor: 'declared-base', token, declaredBase: baseMatch[1] };
  }

  // No anchor could be determined — silently skip
  return { kind: 'skip', reason: 'no-anchor' };
}

/**
 * Extract all candidate path tokens from a markdown file, skipping fenced code blocks.
 * Returns raw tokens; call {@link classifyToken} on each to classify.
 */
export function extractPaths(fileContent: string): ExtractedToken[] {
  const lines = fileContent.split('\n');
  const results: ExtractedToken[] = [];
  let inFencedCode = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;

    // Toggle fenced-code state on ``` fence lines
    if (rawLine.trimStart().startsWith('```')) {
      inFencedCode = !inFencedCode;
      continue;
    }

    if (inFencedCode) {
      continue;
    }

    // Extract backtick inline-code spans that contain a slash
    const backtickRe = /`([^`]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = backtickRe.exec(rawLine)) !== null) {
      const tok = m[1];
      if (tok.includes('/')) {
        results.push({ line: lineNum, token: tok, tokenKind: 'backtick', rawLine });
      }
    }

    // Extract markdown link targets (including any #fragment)
    const linkRe = /\]\(([^)]+)\)/g;
    while ((m = linkRe.exec(rawLine)) !== null) {
      results.push({ line: lineNum, token: m[1], tokenKind: 'markdown-link', rawLine });
    }
  }

  return results;
}
