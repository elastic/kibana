import type { UserActivityServiceSetup, UserActivityServiceStart } from '@kbn/core-user-activity-server';
/** @internal */
export interface SessionContext {
    /** Redacted session id. */
    id?: string;
}
/** @internal */
export interface SpaceContext {
    /** Kibana space id. */
    id?: string;
}
/** @internal */
export interface UserContext {
    /** User profile id. */
    id?: string;
    /** Username / login name. */
    name?: string;
    /** User email address. */
    email?: string;
    /** User roles. */
    roles?: string[];
}
/** @internal */
export interface ClientContext {
    /** Client IP address. */
    ip?: string;
    /** Copy of {@link ClientContext.ip} for OTel compliance. */
    address?: string;
}
/** @internal */
export interface HttpRequestContext {
    /** HTTP referrer. */
    referrer?: string;
}
/**
 * Context automatically injected by HTTP middleware.
 * @internal
 */
export interface InjectedContext {
    /** Client information. */
    client?: ClientContext;
    /** HTTP request information. */
    http?: {
        request?: HttpRequestContext;
    };
    /** Session information. */
    session?: SessionContext;
    /** Kibana-specific information. */
    kibana?: {
        space?: SpaceContext;
    };
    /** User information. */
    user?: UserContext;
}
/** @internal */
export interface InternalUserActivityServiceSetup extends UserActivityServiceSetup {
    /**
     * Sets request-scoped context that will be included in tracked actions.
     * Multiple calls merge the context.
     *
     * @param newContext {@link InjectedContext}
     */
    setInjectedContext(newContext: InjectedContext): void;
}
/** @internal */
export interface InternalUserActivityServiceStart extends UserActivityServiceStart {
    /**
     * Sets request-scoped context that will be included in tracked actions.
     * Multiple calls merge the context.
     *
     * @param newContext {@link InjectedContext}.
     */
    setInjectedContext(newContext: InjectedContext): void;
}
