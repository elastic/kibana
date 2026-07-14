import { z } from '@kbn/zod/v4';
import type { KbnZodType } from './kbn_zod_type';
/**
 * This is a helper schema to pass through any value without validation.
 * KbnZodTypes.PassThroughAny helps identify that it is a deliberate pass through of any value without validation.
 */
declare const _PassThroughAny: z.ZodAny;
export declare const PassThroughAny: typeof _PassThroughAny & KbnZodType;
export declare const isPassThroughAny: (val: unknown) => val is typeof PassThroughAny;
export {};
