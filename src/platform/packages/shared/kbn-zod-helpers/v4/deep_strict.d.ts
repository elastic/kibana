import { z } from '@kbn/zod/v4';
/**
 * Wraps a Zod schema to deeply reject any unrecognized keys in the input.
 *
 * This works by trial-parsing the input with the given schema, then comparing
 * the flattened keys of the raw input against the flattened keys of the parsed
 * output. Any excess keys in the input will cause validation to fail.
 *
 * The actual parsing is done by piping through the original schema, so all
 * schema-level errors are preserved.
 */
export declare function DeepStrict<TSchema extends z.ZodType>(schema: TSchema): z.ZodPipe<z.ZodUnknown, TSchema>;
