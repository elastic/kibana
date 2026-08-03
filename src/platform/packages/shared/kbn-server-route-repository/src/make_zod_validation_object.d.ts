import type { z } from '@kbn/zod/v4';
import type { ZodParamsObject } from '@kbn/server-route-repository-utils';
export declare function makeZodValidationObject(params: ZodParamsObject): {
    params: z.ZodObject<{}, z.core.$strict> | z.ZodPipe<z.ZodUnknown, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    query: z.ZodObject<{}, z.core.$strict> | z.ZodPipe<z.ZodUnknown, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    body: z.ZodUnion<readonly [z.ZodObject<{}, z.core.$strict>, z.ZodNull, z.ZodUndefined]> | z.ZodPipe<z.ZodUnknown, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
};
