/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScalar, parseDocument } from 'yaml';

const COLLECTION = /^(?:\[[\s\S]*\]|\{[\s\S]*\})$/;

/** The text without the whitespace that is outside string literals, which JSON ignores. */
const withoutInsignificantSpace = (text: string): string =>
  text.replace(/"(?:[^"\\]|\\.)*"|\s+/g, (match) => (match.startsWith('"') ? match : ''));

/**
 * A list or an object written as JSON. Only when writing the parsed value back gives the same
 * text (spacing aside), so `[1.0]`, `[1e3]`, long integers, repeated names and names that would
 * change order are left as text, and so is anything that is not JSON (`{{x}}`, `[a]`, `{a}`).
 */
const coerceJsonCollection = (text: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null &&
      typeof parsed === 'object' &&
      JSON.stringify(parsed) === withoutInsignificantSpace(text)
      ? parsed
      : text;
  } catch {
    return text;
  }
};

/**
 * What a single typed word means as YAML: `true` is a boolean, `null` is null, `1.5` is a number,
 * and anything else (`true_false`, `1N`, `undefined`) is the text itself. Text with a space is
 * always text, except a JSON list or object, whose spaces mean nothing (`["a", "b"]`).
 *
 * Only a plain scalar counts, so what the parser would read as a map, a list, a comment, an
 * anchor, a tag or a quoted string stays text. A number counts only when writing it back gives
 * the same text, so `007`, `1.10`, `1e3` and integers beyond the safe range are not changed.
 */
export const coerceSingleWord = (text: string): unknown => {
  if (text === '') return text;
  if (COLLECTION.test(text)) return coerceJsonCollection(text);
  if (/\s/.test(text)) return text;
  const document = parseDocument(text);
  const { contents } = document;
  if (
    document.errors.length > 0 ||
    !isScalar(contents) ||
    contents.type !== 'PLAIN' ||
    contents.anchor !== undefined ||
    contents.tag !== undefined ||
    contents.comment != null
  ) {
    return text;
  }
  const { value } = contents;
  if (typeof value === 'boolean' || value === null) return value;
  if (typeof value === 'number' && Number.isFinite(value) && String(value) === text) return value;
  return text;
};
