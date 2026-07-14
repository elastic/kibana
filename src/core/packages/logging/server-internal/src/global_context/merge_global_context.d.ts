import type { LogMeta } from '@kbn/logging';
import type { GlobalContext } from './types';
/**
 * Takes a flattened object of {@link GlobalContext} and applies it to the
 * provided {@link LogMeta}.
 *
 * @remarks
 * The provided `LogMeta` takes precedence over the `GlobalContext`;
 * if duplicate keys are found, the `GlobalContext` will be overridden.
 *
 * @example
 * ```ts
 * const meta: LogMeta = {
 *   a: { b: false },
 *   d: 'hi',
 * };
 * const context: GlobalContext = {
 *   'a.b': true,
 *   c: [1, 2, 3],
 * };
 *
 * mergeGlobalContext(context, meta);
 * // {
 * //   a: { b: false },
 * //   c: [1, 2, 3],
 * //   d: 'hi',
 * // }
 * ```
 *
 * @internal
 */
export declare function mergeGlobalContext(globalContext: GlobalContext, meta?: LogMeta): LogMeta | undefined;
