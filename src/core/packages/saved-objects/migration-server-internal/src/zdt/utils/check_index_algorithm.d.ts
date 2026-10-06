import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
/**
 * The list of values returned by `checkIndexCurrentAlgorithm`.
 *
 * - `zdt`: last algo that ran was zdt
 *
 * - `v2-compatible`: last running algo was a v2 version that zdt can take over
 *
 * - `v2-incompatible`: last running algo was a v2 version that zdt can not take over
 *
 * - `v2-partially-migrated`: last running algo was zdt taking over v2, but the migration failed at some point
 *
 * - `unknown`: last running algo cannot be determined
 */
export type CheckCurrentAlgorithmResult = 'zdt' | 'v2-partially-migrated' | 'v2-compatible' | 'v2-incompatible' | 'unknown';
export declare const checkIndexCurrentAlgorithm: (indexMapping: IndexMapping) => CheckCurrentAlgorithmResult;
