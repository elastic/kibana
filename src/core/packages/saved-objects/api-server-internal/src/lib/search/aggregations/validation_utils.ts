/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { fieldDefined, hasFilterKeyError } from '../utils/filter_utils';

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
  if (splits.length <= 1) {
    return false;
  }

  const [type, firstPath, ...otherPaths] = splits;
  if (allowedTypes.includes(firstPath)) {
    return false;
  }
  return (
    allowedTypes.includes(type) && fieldDefined(indexMapping, [firstPath, ...otherPaths].join('.'))
  );
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
  const [, ...attributes] = attributePath.split('.');
  return attributes.join('.');
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
