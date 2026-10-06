/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Returns true if the given attribute path is a valid root level SO attribute path
 *
 * @example
 * ```ts
 * isRootLevelAttribute('myType.updated_at', indexMapping, ['myType']})
 * // => true
 * ```
 */
export declare const isRootLevelAttribute: (
  attributePath: string,
  indexMapping: IndexMapping,
  allowedTypes: string[]
) => boolean;
/**
 * Rewrites a root level attribute path to strip the type
 *
 * @example
 * ```ts
 * rewriteRootLevelAttribute('myType.updated_at')
 * // => 'updated_at'
 * ```
 */
export declare const rewriteRootLevelAttribute: (attributePath: string) => string;
/**
 * Returns true if the given attribute path is a valid object type level SO attribute path
 *
 * @example
 * ```ts
 * isObjectTypeAttribute('myType.attributes.someField', indexMapping, ['myType']})
 * // => true
 * ```
 */
export declare const isObjectTypeAttribute: (
  attributePath: string,
  indexMapping: IndexMapping,
  allowedTypes: string[]
) => boolean;
/**
 * Rewrites a object type attribute path to strip the type
 *
 * @example
 * ```ts
 * rewriteObjectTypeAttribute('myType.attributes.foo')
 * // => 'myType.foo'
 * ```
 */
export declare const rewriteObjectTypeAttribute: (attributePath: string) => string;
