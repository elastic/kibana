/**
 * Core's UIAM service
 *
 * @public
 */
export interface CoreUiamService {
    /**
     * A UIAM shared secret should always be provided with UIAM internal credentials via the `x-client-authentication`
     * HTTP header if the credentials are primary, and via `es-secondary-x-client-authentication` if they are secondary.
     */
    readonly sharedSecret: string;
}
