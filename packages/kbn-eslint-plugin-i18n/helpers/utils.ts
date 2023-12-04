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

export function cleanString(str: string) {
  return str
    .replace(/```\w*```/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z\s]*/g, '')
    .trim();
}
