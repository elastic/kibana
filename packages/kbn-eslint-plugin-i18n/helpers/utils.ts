/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function lowerCaseFirstLetter(str: string) {
  if (isUpperCase(str)) return str.toLowerCase();

  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function upperCaseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  return value != null;
}

function isUpperCase(val: string) {
  return /^[A-Z]+$/.test(val);
}

export function geti18nIdentifierFromString(str: string) {
  return str
    .trim()
    .replace(/```\w*```/g, '')
    .replace(/[\'\"]+/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter((_, i) => i <= 3)
    .map(upperCaseFirstLetter)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word))
    .join('')
    .replace(/[^a-zA-Z\s]*/g, '');
}

export function getTranslatableValueFromString(str: string) {
  const strTrimmed = str.trim();

  if (strTrimmed.length === 1) {
    return '';
  }

  // Markdown
  if (strTrimmed.replace(/```\w*```/g, '').length === 0) {
    return '';
  }

  // Special characters, numbers, and white spaces
  if (strTrimmed.replace(/[!\@\#\$\%\^\&\*\(\)\_\+\{\}\|]|[0-9]|\s+/g, '').length === 0) {
    return '';
  }

  return strTrimmed;
}
