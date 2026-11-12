/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fileURLToPath } from 'node:url';

export const MAX_NAME_BYTES = 48;
export const MAX_LOCATION_BYTES = 120;
const ELLIPSIS = '…';
const ELLIPSIS_BYTES = 3;

export interface SanitizeOptions {
  maxBytes: number;
  keep: 'start' | 'end';
}

/** C0/C1 control characters and lone UTF-16 surrogates. */
const isUnsafeCodePoint = (code: number): boolean =>
  code < 0x20 || (code >= 0x7f && code <= 0x9f) || (code >= 0xd800 && code <= 0xdfff);

/** Byte length of a single valid code point once JSON-encoded (`"` and `\` are escaped). */
const jsonCharBytes = (char: string, code: number): number => {
  if (char === '"' || char === '\\') {
    return 2;
  }
  if (code <= 0x7f) {
    return 1;
  }
  if (code <= 0x7ff) {
    return 2;
  }
  if (code <= 0xffff) {
    return 3;
  }
  return 4;
};

/**
 * Replaces control characters and lone surrogates with `?`, and bounds `value` to `maxBytes`
 * JSON-encoded UTF-8 bytes without splitting a code point.
 */
export const sanitize = (value: string, { maxBytes, keep }: SanitizeOptions): string => {
  const chars: string[] = [];
  const sizes: number[] = [];
  let totalBytes = 0;

  for (const raw of value) {
    const code = raw.codePointAt(0)!;
    const char = isUnsafeCodePoint(code) ? '?' : raw;
    const size = jsonCharBytes(char, isUnsafeCodePoint(code) ? 0x3f : code);
    chars.push(char);
    sizes.push(size);
    totalBytes += size;
  }

  if (totalBytes <= maxBytes) {
    return chars.join('');
  }

  if (keep === 'start') {
    let used = 0;
    let end = 0;
    while (end < chars.length && used + sizes[end] <= maxBytes) {
      used += sizes[end];
      end++;
    }
    return chars.slice(0, end).join('');
  }

  if (maxBytes < ELLIPSIS_BYTES) {
    return '';
  }
  const tailBudget = maxBytes - ELLIPSIS_BYTES;
  let used = 0;
  let start = chars.length;
  while (start > 0 && used + sizes[start - 1] <= tailBudget) {
    start--;
    used += sizes[start];
  }
  return `${ELLIPSIS}${chars.slice(start).join('')}`;
};

/**
 * Resolves a profiler `callFrame.url` to a repo-relative path, a `node:` specifier, or a basename
 * (without applying length truncation, so the caller can match `src/` / `x-pack/` / `node_modules/@kbn/`
 * before capping).
 */
export const relativeLocation = (url: string, root: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  let path = url.replace(/[?#].*$/, '');
  if (path.startsWith('file://')) {
    try {
      path = fileURLToPath(new URL(path));
    } catch {
      path = path.slice('file://'.length);
    }
  }
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  if (path.startsWith(normalizedRoot)) {
    return path.slice(normalizedRoot.length);
  }
  if (path.startsWith('node:')) {
    return path;
  }
  return path.slice(path.lastIndexOf('/') + 1);
};

/**
 * Formats a `callFrame` URL and 0-based `lineNumber` as a sanitised, length-capped location.
 */
export const sanitizeLocation = (
  url: string,
  lineNumber: number,
  root: string
): string | undefined => {
  const path = relativeLocation(url, root);
  if (path === undefined) {
    return undefined;
  }
  const withLine = lineNumber >= 0 ? `${path}:${lineNumber + 1}` : path;
  return sanitize(withLine, { maxBytes: MAX_LOCATION_BYTES, keep: 'end' });
};
