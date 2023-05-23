/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Wrap the key with [] if it is a key from an Array
 * @param key The object key
 * @param isArrayItem Flag to indicate if it is the key of an Array
 */
const renderKey = (key: string, isArrayItem: boolean): string => (isArrayItem ? `[${key}]` : key);

export const flattenObject = (
  obj: Record<any, any>,
  prefix: string[] = [],
  isArrayItem = false
): Record<any, any> =>
  Object.keys(obj).reduce<Record<any, any>>((acc, k) => {
    const nextValue = obj[k];

    if (typeof nextValue === 'object' && nextValue !== null) {
      const isNextValueArray = Array.isArray(nextValue);
      const dotSuffix = isNextValueArray ? '' : '.';

      if (Object.keys(nextValue).length > 0) {
        return {
          ...acc,
          ...flattenObject(
            nextValue,
            [...prefix, `${renderKey(k, isArrayItem)}${dotSuffix}`],
            isNextValueArray
          ),
        };
      }
    }

    const fullPath = `${prefix.join('')}${renderKey(k, isArrayItem)}`;
    acc[fullPath] = nextValue;

    return acc;
  }, {});
