/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexMapping } from '../../../mappings';
import { fieldDefined, hasFilterKeyError } from '../filter_utils';

/**
 * Returns true if the given attribute path is a valid root level SO attribute path
 *
 * @example
 * ```ts
 * isRootLevelAttribute('myType.updated_at', indexMapping, ['myType']})
 * // => true
 * ```
 */
export const isRootLevelAttribute = (
  attributePath: string,
  indexMapping: IndexMapping,
  allowedTypes: string[]
): boolean => {
  const splits = attributePath.split('.');
  if (splits.length !== 2) {
    return false;
  }

  const [type, fieldName] = splits;
  if (allowedTypes.includes(fieldName)) {
    return false;
  }
  return allowedTypes.includes(type) && fieldDefined(indexMapping, fieldName);
};

/**
 * Rewrites a root level attribute path to strip the type
 *
 * @example
 * ```ts
 * rewriteRootLevelAttribute('myType.updated_at')
 * // => 'updated_at'
 * ```
 */
export const rewriteRootLevelAttribute = (attributePath: string) => {
  return attributePath.split('.')[1];
};

/**
 * Returns true if the given attribute path is a valid object type level SO attribute path
 *
 * @example
 * ```ts
 * isObjectTypeAttribute('myType.attributes.someField', indexMapping, ['myType']})
 * // => true
 * ```
 */
export const isObjectTypeAttribute = (
  attributePath: string,
  indexMapping: IndexMapping,
  allowedTypes: string[]
): boolean => {
  const error = hasFilterKeyError(attributePath, allowedTypes, indexMapping);
  return error == null;
};

/**
 * Rewrites a object type attribute path to strip the type
 *
 * @example
 * ```ts
 * rewriteObjectTypeAttribute('myType.attributes.foo')
 * // => 'myType.foo'
 * ```
 */
export const rewriteObjectTypeAttribute = (attributePath: string) => {
  return attributePath.replace('.attributes', '');
};
