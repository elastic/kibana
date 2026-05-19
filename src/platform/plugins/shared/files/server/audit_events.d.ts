import type { EcsEvent } from '@elastic/ecs';
import type { AuditEvent } from '@kbn/security-plugin/server';
export type AuditAction = 'create' | 'delete';
interface CreateAuditEventArgs {
    message: string;
    action: AuditAction;
    error?: Error;
    outcome?: EcsEvent['outcome'];
}
export declare function createAuditEvent({ message, action, error, outcome, }: CreateAuditEventArgs): AuditEvent;
export {};
