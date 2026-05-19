export type ConnectorAuthorizationReason = 'no_token' | 'token_expired' | 'refresh_token_expired' | 'token_revoked' | 'refresh_failed';
/**
 * Structured error thrown when a connector fails to authorize, and should
 * specifically be used to signal that the connector requires user re-authorization.
 */
export declare class ConnectorAuthorizationError extends Error {
    readonly authMethod: string;
    readonly reason: ConnectorAuthorizationReason;
    constructor({ authMethod, reason, message, }: {
        authMethod: string;
        reason: ConnectorAuthorizationReason;
        message: string;
    });
}
export declare const isConnectorAuthorizationError: (error: unknown) => error is ConnectorAuthorizationError;
