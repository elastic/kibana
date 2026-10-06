import type { ServiceToken } from '@kbn/core-di';
import type { AuditLogger as IAuditLogger } from '@kbn/core-security-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
/**
 * The audit logger scoped to the current HTTP request.
 * @see {@link IAuditLogger}
 * @public
 */
export declare const AuditLogger: ServiceToken<IAuditLogger>;
/**
 * The user authenticated for the current HTTP request or `null` if the request is not authenticated.
 * @see {@link AuthenticatedUser}
 * @public
 */
export declare const CurrentUser: ServiceToken<AuthenticatedUser | null>;
/**
 * The redacted session ID for the current HTTP request or `undefined` if the request has no session.
 * @public
 */
export declare const RedactedSessionId: ServiceToken<string | undefined>;
