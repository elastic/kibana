import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * No Authentication
 */
export declare const NoAuth: AuthTypeSpec<AuthSchemaType>;
export {};
