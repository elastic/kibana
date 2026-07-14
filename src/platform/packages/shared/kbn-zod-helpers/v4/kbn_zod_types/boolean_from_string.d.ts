import { z } from '@kbn/zod/v4';
import type { KbnZodType } from './kbn_zod_type';
/**
 * This is a helper schema to convert a boolean string ("true" or "false") to a
 * boolean. Useful for processing query params.
 *
 * Accepts "true" or "false" as strings, or a boolean.
 */
declare const _BooleanFromString: z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
    true: "true";
    false: "false";
}>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]>;
export declare const BooleanFromString: typeof _BooleanFromString & KbnZodType;
export declare const isBooleanFromString: (val: unknown) => val is typeof BooleanFromString;
export {};
