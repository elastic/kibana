import type { Headers } from '@kbn/core-http-server';
import type { HTTPAuthorizationHeader } from '@kbn/core-security-server';
/**
 * The credential an Elasticsearch client is being scoped with, plus where it came from, used to
 * decide whether the UIAM shared secret should be attached. See
 * {@link CoreUiamService.getElasticsearchClientAuthentication}.
 */
export type UiamClientAuthenticationParams = {
    /** Kibana minted or stored the credential itself, so nothing has to vouch for it. */
    credentialSource: 'internal';
    /** The credential that will be sent to Elasticsearch. */
    credential: HTTPAuthorizationHeader;
} | {
    /**
     * The credential is a user-created (external) UIAM API key. UIAM rejects external keys
     * presented with client authentication, so the shared secret must never be attached to it.
     * Consumers signal this by marking the fake request that carries the credential with
     * `markExternalUiamCredential` from `@kbn/core-security-server`.
     */
    credentialSource: 'external';
    /** The credential that will be sent to Elasticsearch. */
    credential: HTTPAuthorizationHeader;
} | {
    /** The credential rode in over HTTP, so the request has to vouch for it. */
    credentialSource: 'inbound';
    /** The credential that will be sent to Elasticsearch. */
    credential: HTTPAuthorizationHeader;
    /**
     * The client authentication already resolved for the credential, either relayed by the
     * upstream caller or chosen by the authentication provider that produced the credential.
     * Read from the same headers as the credential, not from the raw request: a provider may
     * have set it without it ever riding in on the wire.
     */
    relayedClientAuthentication: string | string[] | undefined;
    /**
     * Raw inbound request headers, carrying the attestation that proves an attacker-reachable
     * request nonetheless came from a trusted loopback caller. Nothing in here is trustworthy
     * until the attestation has been verified.
     */
    requestHeaders: Headers;
};
/**
 * Core's UIAM service
 *
 * @public
 */
export interface CoreUiamService {
    /**
     * Returns the UIAM shared secret to attach as Elasticsearch client authentication (the
     * `x-client-authentication` header for primary credentials, `es-secondary-x-client-authentication`
     * for secondary ones), or `undefined` when nothing should be attached. Encapsulates the
     * internal-vs-external UIAM distinction so the Elasticsearch client stays agnostic of UIAM
     * specifics (the credential prefix, the attestation header, and its verification):
     *
     * - non-UIAM credential -> `undefined`;
     * - internal UIAM credential -> the shared secret;
     * - external (user-created) UIAM credential -> `undefined`, UIAM rejects external API keys
     * presented with client authentication;
     * - inbound UIAM credential -> the relayed client authentication when there is one, even if
     * empty; otherwise the shared secret only with a valid attestation, proving the loopback caller
     * is trusted.
     */
    getElasticsearchClientAuthentication(params: UiamClientAuthenticationParams): string | string[] | undefined;
}
/**
 * Builds the core {@link CoreUiamService}.
 */
export declare function createCoreUiamService(sharedSecret: string): CoreUiamService;
