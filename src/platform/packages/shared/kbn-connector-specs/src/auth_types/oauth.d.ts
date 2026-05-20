import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    tokenUrl: z.ZodURL;
    clientId: z.ZodString;
    scope: z.ZodOptional<z.ZodString>;
    clientSecret: z.ZodString;
    tokenEndpointAuthMethod: z.ZodOptional<z.ZodEnum<{
        client_secret_post: "client_secret_post";
        client_secret_basic: "client_secret_basic";
    }>>;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * OAuth2 Client Credentials Flow
 */
export declare const OAuth: AuthTypeSpec<AuthSchemaType>;
export {};
