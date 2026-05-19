import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    serviceAccountJson: z.ZodString;
    scope: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * GCP Service Account Authentication
 *
 * Uses a GCP service account JSON key to obtain short-lived access tokens
 * via the JWT bearer assertion flow (RFC 7523).
 *
 * Flow:
 * 1. Parse the service account JSON to extract client_email and private_key
 * 2. Create a self-signed JWT (RS256) with the requested OAuth scope
 * 3. Exchange the JWT for an access token at Google's token endpoint
 * 4. Set the access token as a Bearer Authorization header
 *
 * Use for: Cloud Functions, Cloud Run, Cloud Storage, BigQuery, and any GCP API.
 */
export declare const GcpServiceAccountAuth: AuthTypeSpec<AuthSchemaType>;
export {};
