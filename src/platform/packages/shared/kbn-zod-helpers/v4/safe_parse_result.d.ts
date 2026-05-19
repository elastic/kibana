import type { z } from '@kbn/zod/v4';
/**
 * Safely parse a payload against a schema, returning the output or undefined.
 * This method does not throw validation errors and is useful for validating
 * optional objects when we don't care about errors.
 *
 * @param payload Schema payload
 * @param schema Validation schema
 * @returns Schema output or undefined
 */
export declare function safeParseResult<T extends z.ZodType>(payload: unknown, schema: T): z.output<T> | undefined;
