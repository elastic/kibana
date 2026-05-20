import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * HTTP Basic Authentication
 * Use for: Username + Password auth (Jira, etc.)
 */
export declare const BasicAuth: AuthTypeSpec<AuthSchemaType>;
export {};
