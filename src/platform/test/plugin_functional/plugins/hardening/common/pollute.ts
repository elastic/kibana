/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PollutionResult {
  object: { prototype?: Record<any, any>; error?: string };
  number: { prototype?: Record<any, any>; error?: string };
  string: { prototype?: Record<any, any>; error?: string };
  boolean: { prototype?: Record<any, any>; error?: string };
  fn: { prototype?: Record<any, any>; error?: string };
  array: { prototype?: Record<any, any>; error?: string };
}

export function tryPollutingPrototypes(): PollutionResult {
  const result: PollutionResult = {
    object: {},
    number: {},
    string: {},
    boolean: {},
    fn: {},
    array: {},
  };

  // Attempt to pollute Object.prototype
  try {
    (({}) as any).__proto__.polluted = true;
  } catch (e) {
    result.object.error = e.message;
  } finally {
    result.object.prototype = { ...Object.keys(Object.getPrototypeOf({})) };
  }

  // Attempt to pollute String.prototype
  try {
    ('asdf' as any).__proto__.polluted = true;
  } catch (e) {
    result.string.error = e.message;
  } finally {
    result.string.prototype = { ...Object.keys(Object.getPrototypeOf('asf')) };
  }

  // Attempt to pollute Number.prototype
  try {
    (12 as any).__proto__.polluted = true;
  } catch (e) {
    result.number.error = e.message;
  } finally {
    result.number.prototype = { ...Object.keys(Object.getPrototypeOf(12)) };
  }

  // Attempt to pollute Boolean.prototype
  try {
    (true as any).__proto__.polluted = true;
  } catch (e) {
    result.boolean.error = e.message;
  } finally {
    result.boolean.prototype = { ...Object.keys(Object.getPrototypeOf(true)) };
  }

  // Attempt to pollute Function.prototype
  const fn = function fn() {};
  try {
    (fn as any).__proto__.polluted = true;
  } catch (e) {
    result.fn.error = e.message;
  } finally {
    result.fn.prototype = { ...Object.keys(Object.getPrototypeOf(fn)) };
  }

  // Attempt to pollute Array.prototype
  try {
    ([] as any).__proto__.polluted = true;
  } catch (e) {
    result.array.error = e.message;
  } finally {
    result.array.prototype = { ...Object.keys(Object.getPrototypeOf([])) };
  }

  return result;
}
