/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Walks `original` alongside its JSON round trip and returns a description of the first value
 * that did not survive, or `undefined` when the two match. Only plain objects, arrays, strings,
 * finite numbers, booleans and `null` survive; an `undefined` object property is dropped by JSON
 * and is accepted as such, an `undefined` array item is not. The check is value-based: it finds
 * what a type annotation can hide behind `any`, a class instance or a `Date`.
 */
export const findJsonRoundTripMismatch = (
  original: unknown,
  roundTripped: unknown,
  path = 'data'
): string | undefined => {
  if (original === null) {
    return roundTripped === null ? undefined : mismatch(path, 'null', roundTripped);
  }

  switch (typeof original) {
    case 'string':
    case 'boolean':
      return original === roundTripped ? undefined : mismatch(path, typeof original, roundTripped);
    case 'number':
      return Number.isFinite(original) && original === roundTripped
        ? undefined
        : mismatch(path, String(original), roundTripped);
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'bigint':
      return mismatch(path, describeOriginal(original), roundTripped);
    case 'object':
      return findObjectMismatch(original as object, roundTripped, path);
  }
};

const findObjectMismatch = (
  original: object,
  roundTripped: unknown,
  path: string
): string | undefined => {
  if (Array.isArray(original)) {
    if (!Array.isArray(roundTripped)) {
      return mismatch(path, 'an array', roundTripped);
    }
    return original
      .map((item, index) =>
        findJsonRoundTripMismatch(item, roundTripped[index], `${path}[${index}]`)
      )
      .find((found) => found !== undefined);
  }

  if (!isPlainObject(original)) {
    return mismatch(path, describeOriginal(original), roundTripped);
  }

  if (!isPlainObject(roundTripped)) {
    return mismatch(path, 'an object', roundTripped);
  }

  return Object.entries(original)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) =>
      findJsonRoundTripMismatch(
        value,
        (roundTripped as Record<string, unknown>)[key],
        `${path}.${key}`
      )
    )
    .find((found) => found !== undefined);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const describeOriginal = (value: unknown): string => {
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value !== 'object' || value === null) {
    return `a ${typeof value}`;
  }
  const name = value.constructor?.name;
  return name && name !== 'Object' ? `an instance of ${name}` : 'an object with a custom prototype';
};

const describeRoundTripped = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'nothing (the property is dropped)';
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0 ? 'an empty object' : 'a plain object';
  }
  return `a ${typeof value}`;
};

const mismatch = (path: string, original: string, roundTripped: unknown): string =>
  `${path} is ${original} and arrives as ${describeRoundTripped(roundTripped)}`;
