/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function lowerCaseFirstChar(str: string) {
  if (isUpperCase(str)) return str.toLowerCase();

  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function upperCaseFirstChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  return value != null;
}

function isUpperCase(val: string) {
  return /^[A-Z]+$/.test(val);
}

export function sanitizeEuiElementName(elementName: string) {
  const name = elementName
    .replace('Eui', '')
    .replace('Empty', '')
    .replace('Icon', '')
    .replace('WithWidth', '')
    .replace('Super', '');

  return {
    elementName: name,
    elementNameWithSpaces: (name.match(/[A-Z][a-z]*/g) || []).join(' '),
  };
}
