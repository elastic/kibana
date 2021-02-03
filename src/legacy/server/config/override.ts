/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const isObject = (v: any): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const assignDeep = (target: Record<string, any>, source: Record<string, any>) => {
  for (let [key, value] of Object.entries(source)) {
    // unwrap dot-separated keys
    if (key.includes('.')) {
      const [first, ...others] = key.split('.');
      key = first;
      value = { [others.join('.')]: value };
    }

    if (isObject(value)) {
      if (!target.hasOwnProperty(key)) {
        target[key] = {};
      }

      assignDeep(target[key], value);
    } else {
      target[key] = value;
    }
  }
};

export const override = (...sources: Array<Record<string, any>>): Record<string, any> => {
  const result = {};

  for (const object of sources) {
    assignDeep(result, object);
  }

  return result;
};
