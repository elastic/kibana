import type { AuditEvent } from './audit_events';
export interface AuditLogger {
    /**
     * Logs an {@link AuditEvent} and automatically adds meta data about the
     * current user, space and correlation id.
     *
     * Guidelines around what events should be logged and how they should be
     * structured can be found in: `/x-pack/platform/plugins/shared/security/README.md`
     *
     * @example
     * ```typescript
     * const auditLogger = securitySetup.audit.asScoped(request);
     * auditLogger.log({
     *   message: 'User is updating dashboard [id=123]',
     *   event: {
     *     action: 'saved_object_update',
     *     outcome: 'unknown'
     *   },
     *   kibana: {
     *     saved_object: { type: 'dashboard', id: '123' }
     *   },
     * });
     * ```
     */
    log: (event: AuditEvent | undefined) => void;
    /**
     * Indicates whether audit logging is enabled or not.
     *
     * Useful for skipping resource-intense operations that don't need to be performed when audit
     * logging is disabled.
     */
    readonly enabled: boolean;
    /**
     * Indicates whether to include saved objects names in audit log
     */
    readonly includeSavedObjectNames: boolean;
}
