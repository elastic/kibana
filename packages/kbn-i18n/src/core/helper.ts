/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const isString = (value: any): value is string => typeof value === 'string';

export const isObject = (value: any): value is object =>
  typeof value === 'object' && value !== null;

export const hasValues = (values: any) => Object.keys(values).length > 0;

export const unique = <T>(arr: T[] = []): T[] => [...new Set(arr)];

const merge = (a: any, b: any): { [k: string]: any } =>
  unique([...Object.keys(a), ...Object.keys(b)]).reduce((acc, key) => {
    if (isObject(a[key]) && isObject(b[key]) && !Array.isArray(a[key]) && !Array.isArray(b[key])) {
      return {
        ...acc,
        [key]: merge(a[key], b[key]),
      };
    }

    return {
      ...acc,
      [key]: b[key] === undefined ? a[key] : b[key],
    };
  }, {});

export const mergeAll = (...sources: any[]) =>
  sources.filter(isObject).reduce((acc, source) => merge(acc, source));
