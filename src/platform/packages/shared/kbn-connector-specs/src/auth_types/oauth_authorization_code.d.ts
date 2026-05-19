import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
export declare const OAUTH_AUTHORIZATION_CODE_AUTH_ID = "oauth_authorization_code";
declare const authSchema: z.ZodObject<{
    authorizationUrl: z.ZodURL;
    tokenUrl: z.ZodURL;
    clientId: z.ZodString;
    clientSecret: z.ZodString;
    scope: z.ZodOptional<z.ZodString>;
    useBasicAuth: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    scopeParamName: z.ZodOptional<z.ZodString>;
    accessTokenPath: z.ZodOptional<z.ZodString>;
    tokenTypePath: z.ZodOptional<z.ZodString>;
    tokenType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * OAuth2 Authorization Code Flow with PKCE
 *
 * This is a generic, reusable auth type for any OAuth2 provider that supports the
 * Authorization Code flow (Microsoft, Google, Salesforce, Slack, etc.).
 *
 * ## How it works:
 * 1. User clicks the "Authorize" button in the connector UI
 * 2. _start_oauth_flow route generates PKCE parameters and returns the provider's authorization URL
 * 3. UI opens the authorization URL where user authorizes the app
 * 4. Provider redirects back to the _oauth_callback route with the authorization code
 * 5. Callback route exchanges code for access/refresh tokens and stores them
 * 6. Tokens are auto-refreshed when expired during connector execution
 *
 * ## Usage in connector specs:
 * Different providers use different OAuth endpoints - specify these in your connector's auth defaults:
 *
 * ```typescript
 * // Example: Microsoft/SharePoint
 * auth: {
 *   types: [{
 *     type: 'oauth_authorization_code',
 *     defaults: {
 *       authorizationUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize',
 *       tokenUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
 *       scope: 'https://graph.microsoft.com/.default offline_access'
 *     }
 *   }]
 * }
 *
 * // Example: Google Drive
 * auth: {
 *   types: [{
 *     type: 'oauth_authorization_code',
 *     defaults: {
 *       authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
 *       tokenUrl: 'https://oauth2.googleapis.com/token',
 *       scope: 'https://www.googleapis.com/auth/drive.readonly'
 *     }
 *   }]
 * }
 * ```
 *
 * Users will fill in their client ID, client secret, and can customize URLs/scopes if needed.
 * The _start_oauth_flow and _oauth_callback routes are generic and work with any provider.
 */
export declare const OAuthAuthorizationCode: AuthTypeSpec<AuthSchemaType>;
export {};
