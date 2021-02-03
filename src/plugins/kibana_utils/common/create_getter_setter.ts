/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type Get<T> = () => T;
export type Set<T> = (value: T) => void;

export const createGetterSetter = <T extends object>(name: string): [Get<T>, Set<T>] => {
  let value: T;

  const get: Get<T> = () => {
    if (!value) throw new Error(`${name} was not set.`);
    return value;
  };

  const set: Set<T> = (newValue) => {
    value = newValue;
  };

  return [get, set];
};
