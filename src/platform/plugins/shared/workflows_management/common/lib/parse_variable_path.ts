/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type PathSegment =
  | { type: 'identifier'; value: string }
  | { type: 'numeric_index'; value: number }
  | { type: 'string_literal'; value: string; quote: '"' | "'" }
  | { type: 'dynamic_access'; path: PathSegment[] };

interface ParsePathResult {
  segments: PathSegment[];
  pos: number;
}

export function parsePropertyPath(input: string): ParsePathResult | null {
  let pos = 0;
  const segments: PathSegment[] = [];

  const firstSegment = parseIdentifier(input, pos);
  if (!firstSegment) return null;
  segments.push(firstSegment.segment);
  pos = firstSegment.pos;

  while (pos < input.length) {
    if (input[pos] === '.') {
      pos++;
      const seg = parseIdentifier(input, pos);
      if (!seg) return null;
      segments.push(seg.segment);
      pos = seg.pos;
    } else if (input[pos] === '[') {
      const bracket = parseBracketAccessor(input, pos);
      if (!bracket) return null;
      segments.push(bracket.segment);
      pos = bracket.pos;
    } else {
      break;
    }
  }

  return { segments, pos };
}

export function isValidPropertyPath(path: string): boolean {
  const result = parsePropertyPath(path);
  return result !== null && result.pos === path.length;
}

function parseIdentifier(input: string, pos: number): { segment: PathSegment; pos: number } | null {
  if (pos >= input.length || !/[a-zA-Z_$]/.test(input[pos])) return null;

  let end = pos + 1;
  while (end < input.length && /[a-zA-Z0-9_$]/.test(input[end])) {
    end++;
  }

  return { segment: { type: 'identifier', value: input.slice(pos, end) }, pos: end };
}

function parseBracketAccessor(
  input: string,
  startPos: number
): { segment: PathSegment; pos: number } | null {
  if (input[startPos] !== '[') return null;
  let cursor = startPos + 1;

  while (cursor < input.length && input[cursor] === ' ') cursor++;

  if (cursor >= input.length) return null;

  let result: { segment: PathSegment; pos: number } | null = null;

  if (/\d/.test(input[cursor])) {
    result = parseNumericIndex(input, cursor);
  } else if (input[cursor] === '"' || input[cursor] === "'") {
    result = parseStringLiteral(input, cursor);
  } else if (/[a-zA-Z_$]/.test(input[cursor])) {
    result = parseDynamicAccess(input, cursor);
  }

  if (!result) return null;
  cursor = result.pos;

  while (cursor < input.length && input[cursor] === ' ') cursor++;

  if (cursor >= input.length || input[cursor] !== ']') return null;
  cursor++;

  return { segment: result.segment, pos: cursor };
}

function parseNumericIndex(
  input: string,
  pos: number
): { segment: PathSegment; pos: number } | null {
  let end = pos;
  while (end < input.length && /\d/.test(input[end])) end++;
  if (end === pos) return null;

  return {
    segment: { type: 'numeric_index', value: parseInt(input.slice(pos, end), 10) },
    pos: end,
  };
}

function parseStringLiteral(
  input: string,
  startPos: number
): { segment: PathSegment; pos: number } | null {
  const quote = input[startPos] as '"' | "'";
  const contentStart = startPos + 1;
  let end = contentStart;
  while (end < input.length && input[end] !== quote) {
    if (input[end] === '\\') end++;
    end++;
  }
  if (end >= input.length) return null;

  const value = input.slice(contentStart, end);
  return { segment: { type: 'string_literal', value, quote }, pos: end + 1 };
}

function parseDynamicAccess(
  input: string,
  pos: number
): { segment: PathSegment; pos: number } | null {
  const innerResult = parsePropertyPath(input.slice(pos));
  if (!innerResult || innerResult.segments.length === 0) return null;

  return {
    segment: { type: 'dynamic_access', path: innerResult.segments },
    pos: pos + innerResult.pos,
  };
}

export function segmentsToString(segments: PathSegment[]): string {
  return segments
    .map((seg, i) => {
      switch (seg.type) {
        case 'identifier':
          return i === 0 ? seg.value : `.${seg.value}`;
        case 'numeric_index':
          return `[${seg.value}]`;
        case 'string_literal':
          return `[${seg.quote}${seg.value}${seg.quote}]`;
        case 'dynamic_access':
          return `[${segmentsToString(seg.path)}]`;
        default:
          return '';
      }
    })
    .join('');
}

function containsDynamicAccess(segments: PathSegment[]): boolean {
  return segments.some((seg) => seg.type === 'dynamic_access');
}

function extractFirstDynamicAccess(segments: PathSegment[]): DynamicBracketAccessInfo | undefined {
  const dynamicIdx = segments.findIndex((s) => s.type === 'dynamic_access');
  if (dynamicIdx === -1) return undefined;

  const prefixSegments = segments.slice(0, dynamicIdx);
  const suffixSegments = segments.slice(dynamicIdx + 1);
  const dynamicSeg = segments[dynamicIdx] as { type: 'dynamic_access'; path: PathSegment[] };

  return {
    prefixPath: segmentsToString(prefixSegments),
    dynamicKey: segmentsToString(dynamicSeg.path),
    suffixPath: suffixSegments.length > 0 ? segmentsToString(suffixSegments) : null,
  };
}

export function validateVariablePath(path: string): boolean {
  const parsed = parseVariablePath(path);
  return parsed !== null && !parsed.errors;
}

export interface DynamicBracketAccessInfo {
  prefixPath: string;
  dynamicKey: string;
  suffixPath: string | null;
}

export interface ParsedVariablePath {
  errors?: string[];
  propertyPath: string | null;
  filters: string[];
  hasDynamicBracketAccess?: boolean;
  dynamicAccess?: DynamicBracketAccessInfo;
}

export function parseVariablePath(path: string): ParsedVariablePath | null {
  const errors: string[] = [];
  const trimmedPath = path.trim();

  const parts = splitByPipeRespectingParentheses(trimmedPath);

  if (parts.length === 0) {
    return null;
  }

  const propertyPath = parts[0].trim();

  const parsed = parsePropertyPath(propertyPath);
  if (!parsed || parsed.pos !== propertyPath.length) {
    errors.push(`Invalid property path: ${propertyPath}`);
  }

  const filters = parts
    .slice(1)
    .map((filter) => filter.trim())
    .filter((filter) => filter.length > 0);

  for (const filter of filters) {
    const filterName = filter.split('(')[0].trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(filterName)) {
      errors.push(`Invalid filter name: ${filterName}`);
    }
  }

  if (errors.length > 0 || !parsed) {
    return {
      errors,
      propertyPath: null,
      filters: [],
    };
  }

  const { segments } = parsed;
  const hasDynamicBracketAccess = containsDynamicAccess(segments);
  const dynamicAccess = hasDynamicBracketAccess ? extractFirstDynamicAccess(segments) : undefined;

  return {
    propertyPath,
    filters,
    hasDynamicBracketAccess,
    dynamicAccess,
  };
}

function splitByPipeRespectingParentheses(input: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let parenDepth = 0;
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const prevChar = i > 0 ? input[i - 1] : '';

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      currentPart += char;
    } else if (inQuotes && char === quoteChar && prevChar !== '\\') {
      inQuotes = false;
      quoteChar = '';
      currentPart += char;
    } else if (!inQuotes && char === '(') {
      parenDepth++;
      currentPart += char;
    } else if (!inQuotes && char === ')') {
      parenDepth--;
      currentPart += char;
    } else if (!inQuotes && char === '|' && parenDepth === 0) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  return parts;
}
