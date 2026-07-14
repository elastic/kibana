import type { z } from '@kbn/zod/v4';
export declare function createIsNarrowSchema<TBaseSchema extends z.ZodType, TNarrowSchema extends z.ZodType>(_base: TBaseSchema, narrow: TNarrowSchema): <TValue extends z.input<TBaseSchema>>(value: TValue) => value is Extract<TValue, z.input<TNarrowSchema>>;
export declare function isSchema<TSchema extends z.ZodType>(schema: TSchema, value: unknown): value is z.input<TSchema>;
