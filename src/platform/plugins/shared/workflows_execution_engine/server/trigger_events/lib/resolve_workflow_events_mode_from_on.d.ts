import type { WorkflowEventsValue } from '@kbn/workflows';
/**
 * Resolves `on.workflowEvents` the same way event-driven scheduling does: unknown or omitted -> `avoid-loop`.
 */
export declare function resolveWorkflowEventsModeFromOn(on: Record<string, unknown> | null | undefined): WorkflowEventsValue;
