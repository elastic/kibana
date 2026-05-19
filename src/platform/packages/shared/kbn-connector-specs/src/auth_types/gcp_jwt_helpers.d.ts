export interface GcpServiceAccountKey {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
}
export interface GcpAccessToken {
    accessToken: string;
    expiresAt: number;
}
export declare function parseServiceAccountKey(json: string): GcpServiceAccountKey;
/**
 * Exchange a service account's private key for a short-lived GCP access token.
 *
 * Flow:
 * 1. Create a self-signed JWT (RS256) with the service account's private key and an OAuth scope
 * 2. POST the JWT assertion to Google's token endpoint
 * 3. Receive an OAuth2 access token (valid for 1 hour)
 *
 * Use for: Admin API calls (Cloud Run, Cloud Functions, etc.)
 */
export declare function getGcpAccessToken(clientEmail: string, privateKey: string, scope: string): Promise<GcpAccessToken>;
/**
 * Exchange a service account's private key for a GCP identity token (OIDC ID token).
 *
 * Flow:
 * 1. Create a self-signed JWT (RS256) with target_audience set to the service URL
 * 2. POST the JWT assertion to Google's token endpoint
 * 3. Receive an OIDC ID token (valid for 1 hour)
 *
 * Use for: Invoking authenticated Cloud Run services / Cloud Functions.
 * Cloud Run requires ID tokens (not access tokens) for service-to-service auth.
 */
export declare function getGcpIdToken(clientEmail: string, privateKey: string, targetAudience: string): Promise<string>;
