import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
export declare const EARS_AUTH_ID = "ears";
export declare const EARS_PROVIDERS: readonly ["google", "microsoft", "slack"];
declare const authSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        microsoft: "microsoft";
        google: "google";
        slack: "slack";
    }>;
    scope: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * EARS (Elastic Authentication Redirect Service) OAuth Flow
 *
 * EARS is an OAuth proxy that manages client credentials (clientId/clientSecret)
 * on behalf of the user. Instead of users creating their own OAuth apps for each
 * 3rd party, they can rely on the Elastic-owned apps for simplicity.
 * Therefore, connectors using EARS don't require users to input any
 * client credentials — EARS already knows them.
 *
 * EARS Redirect Flow:
 * 1. On `/_start_oauth_flow`, Kibana builds EARS authorize URL with callback_uri, state, scope, pkce_challenge, pkce_method, and redirects to it
 * 2. User visits EARS authorize URL → EARS redirects to OAuth provider and shows auth screen to user, in order for them to enter their credentials and authorize scopes
 * 3. OAuth provider redirects back to EARS with authz code & state
 * 4. EARS redirects to callback_uri (Kibana's `/_oauth_callback`) with authz code & state
 * 5. Kibana then exchanges code via EARS token endpoint: POST {earsTokenUrl} with code & pkce_verifier in the JSON body
 * 6. Tokens are auto-refreshed when expired during connector execution
 */
export declare const Ears: AuthTypeSpec<AuthSchemaType>;
export {};
