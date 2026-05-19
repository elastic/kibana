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
export declare const isRootLevelAttribute: (attributePath: string, indexMapping: IndexMapping, allowedTypes: string[]) => boolean;
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
export declare const isObjectTypeAttribute: (attributePath: string, indexMapping: IndexMapping, allowedTypes: string[]) => boolean;
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
