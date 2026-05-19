import type { Client } from '@elastic/elasticsearch';
/**
 * Creates XML metadata for our mock identity provider.
 *
 * This can be saved to file and used to configure Elasticsearch SAML realm.
 */
export declare function createMockIdpMetadata(): Promise<string>;
/**
 * Creates a SAML response that can be passed directly to the Kibana ACS endpoint to authenticate a user.
 *
 * @example Create a SAML response.
 *
 * ```ts
 * const samlResponse = await createSAMLResponse({
 *    username: '1234567890',
 *    email: 'mail@elastic.co',
 *    full_name: 'Test User',
 *    roles: ['t1_analyst', 'editor'],
 *  })
 * ```
 *
 * @example Authenticate user with SAML response.
 *
 * ```ts
 * fetch('/api/security/saml/callback', {
 *   method: 'POST',
 *   body: JSON.stringify({ SAMLResponse: samlResponse }),
 * })
 * ```
 */
export declare function createSAMLResponse(options: {
    /** ID from SAML authentication request */
    authnRequestId?: string;
    /** SP entity ID for AudienceRestriction (required by UIAM, optional for ES) */
    spEntityId?: string;
    username: string;
    full_name?: string;
    email?: string;
    roles: string[];
    serverless?: {
        organizationId: string;
        projectType: string;
        uiamEnabled: false;
    } | {
        organizationId: string;
        projectType: string;
        uiamEnabled: true;
        accessTokenLifetimeSec?: number;
        refreshTokenLifetimeSec?: number;
    };
}): Promise<string>;
/**
 * Creates the role mapping required for developers to authenticate using SAML.
 */
export declare function ensureSAMLRoleMapping(client: Client): Promise<unknown>;
export declare function generateCosmosDBApiRequestHeaders(httpVerb: 'POST' | 'PUT', resourceType: 'dbs' | 'colls' | 'docs', resourceId: string): {
    Authorization: string;
    'x-ms-date': string;
    'x-ms-version': string;
    'Content-Type': string;
};
export declare const projectTypeToAlias: Map<string, string>;
export declare function createUiamSessionTokens({ username, organizationId, projectType: rawProjectType, roles, fullName, email, accessTokenLifetimeSec, refreshTokenLifetimeSec, }: {
    username: string;
    organizationId: string;
    projectType: string;
    roles: string[];
    fullName?: string;
    email?: string;
    accessTokenLifetimeSec?: number;
    refreshTokenLifetimeSec?: number;
}): Promise<{
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken: string;
    refreshTokenExpiresAt: number;
}>;
/**
 * Creates a UIAM OAuth access token that can be used to test the OAuth token exchange flow.
 *
 * Unlike {@link createUiamSessionTokens}, this creates a token with `typ: 'oauth-access-token'`
 * that includes OAuth-specific claims (audience, scope, client_id, connection_id).
 */
export declare function createUiamOAuthAccessToken({ username, organizationId, projectType, roles, audience, fullName, email, accessTokenLifetimeSec, }: {
    username: string;
    organizationId: string;
    projectType: string;
    roles: string[];
    audience: string;
    fullName?: string;
    email?: string;
    accessTokenLifetimeSec?: number;
}): Promise<string>;
export interface SAMLRequestInfo {
    requestId: string;
    acsUrl?: string;
    issuer?: string;
}
/**
 * Parses a SAML AuthnRequest from the redirect URL and extracts the request ID
 * and optional AssertionConsumerServiceURL. The ACS URL tells us where to POST
 * the SAMLResponse (e.g. UIAM vs Kibana/ES).
 */
export declare function parseSAMLRequest(requestUrl: string): Promise<SAMLRequestInfo | undefined>;
export declare function getSAMLRequestId(requestUrl: string): Promise<string | undefined>;
