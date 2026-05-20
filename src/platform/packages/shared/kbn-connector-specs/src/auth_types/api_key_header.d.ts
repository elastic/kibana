import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    headerField: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodString;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * Header-based authentication (generic)
 * Use for: API keys, custom headers (X-API-Key, etc.)
 */
export declare const ApiKeyHeaderAuth: AuthTypeSpec<AuthSchemaType>;
export {};
