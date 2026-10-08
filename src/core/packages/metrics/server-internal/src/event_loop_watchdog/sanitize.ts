/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Maximum length of any identifier or frame description written to logs. */
export const MAX_FIELD_LENGTH = 256;

/** C0/C1 control characters (incl. CR/LF and ESC) could forge log lines or terminal escapes. */
const isControlCharacter = (code: number): boolean => code < 0x20 || (code >= 0x7f && code <= 0x9f);

/** Caps the length of `value` and replaces control characters so it is safe to log. */
export const sanitize = (value: string): string =>
  Array.from(value.slice(0, MAX_FIELD_LENGTH), (char) =>
    isControlCharacter(char.charCodeAt(0)) ? '?' : char
  ).join('');
