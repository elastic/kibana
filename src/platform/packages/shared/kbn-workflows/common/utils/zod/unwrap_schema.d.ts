import { z } from '@kbn/zod/v4';
/**
 * Peel `optional` / `default` / `nullable` / `lazy` wrappers until reaching the inner type that
 * describes the value. Peeling `lazy` matters for the recursive workflow schemas — e.g.
 * `z.array(z.lazy(stepUnion))` only resolves to the union once the lazy wrapper is gone.
 */
export declare function unwrapSchema(schema: z.ZodType): z.ZodType;
