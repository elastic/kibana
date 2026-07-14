export declare enum AuthzOptOutReason {
    DelegateToESClient = "Route delegates authorization to the scoped ES client",
    DelegateToSOClient = "Route delegates authorization to the scoped SO client",
    ServeStaticFiles = "Route serves static files that do not require authorization"
}
export declare class AuthzDisabled {
    static fromReason(reason: AuthzOptOutReason | string): {
        enabled: false;
        reason: string;
    };
    static readonly delegateToESClient: {
        enabled: false;
        reason: string;
    };
    static readonly delegateToSOClient: {
        enabled: false;
        reason: string;
    };
    static readonly serveStaticFiles: {
        enabled: false;
        reason: string;
    };
}
export declare const unwindNestedSecurityPrivileges: <T extends Array<string | {
    allOf?: string[];
    anyOf?: string[];
}>>(privileges: T) => string[];
