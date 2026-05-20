import type { DedotObject } from '@kbn/utility-types';
export declare function unflattenObject<T extends Record<string, any>>(source: T, target?: Record<string, any>): DedotObject<T>;
