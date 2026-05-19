import { z } from '@kbn/zod/v4';
export declare const passThroughValidationObject: {
    body: z.ZodAny & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType;
    params: z.ZodAny & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType;
    query: z.ZodAny & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType;
};
export declare const noParamsValidationObject: {
    params: z.ZodObject<{}, z.core.$strict>;
    query: z.ZodObject<{}, z.core.$strict>;
    body: z.ZodUnion<readonly [z.ZodObject<{}, z.core.$strict>, z.ZodNull, z.ZodUndefined]>;
};
