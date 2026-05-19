import { z } from '@kbn/zod/v4';
/**
 * This is a helper schema to convert comma separated strings to arrays. Useful
 * for processing query params.
 *
 * @param schema Array items schema
 * @returns Array schema that accepts a comma-separated string as input
 */
export declare function ArrayFromString<T extends z.ZodType>(schema: T): z.ZodPreprocess<z.ZodArray<T>>;
