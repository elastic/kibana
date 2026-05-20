import { z } from '@kbn/zod/v4';
import type { AuthTypeDef } from '../connector_spec';
export declare const AUTH_TYPE_DISCRIMINATOR = "authType";
export declare const getSchemaForAuthType: (authTypeDef: string | AuthTypeDef) => {
    id: string;
    schema: z.ZodObject<{
        [x: string]: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
        authType: z.ZodLiteral<string>;
    }, z.core.$strip>;
};
