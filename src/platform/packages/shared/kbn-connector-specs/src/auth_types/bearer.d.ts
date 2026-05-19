import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * Bearer Token Authentication
 * Use for: OAuth tokens, API tokens sent as "Authorization: Bearer <token>"
 */
export declare const BearerAuth: AuthTypeSpec<AuthSchemaType>;
export {};
