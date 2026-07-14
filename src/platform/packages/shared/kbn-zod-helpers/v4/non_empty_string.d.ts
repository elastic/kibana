import { z } from '@kbn/zod/v4';
import type { RefinementCtx } from '@kbn/zod/v4';
export declare function isNonEmptyString(input: string, ctx: RefinementCtx): void;
export declare const NonEmptyString: z.ZodString;
/**
 * Checks that the input is a string that is not empty while allowing whitespace.
 */
export declare function isNonEmptyOrWhitespace(input: string, ctx: RefinementCtx): void;
export declare const NonEmptyOrWhitespaceString: z.ZodString;
