import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
/**
 * Why a subscribed workflow did or did not match an emitted trigger event (for funnel telemetry).
 */
export type WorkflowTriggerMatchOutcome = 'matched' | 'disabled' | 'kql_false' | 'kql_error';
/**
 * Classifies a workflow for a given trigger id and event payload (enabled gate, trigger block, KQL).
 */
export declare function classifyWorkflowTriggerMatch(workflow: WorkflowDetailDto, triggerId: string, payload: Record<string, unknown>, logger?: Logger): WorkflowTriggerMatchOutcome;
/**
 * Determines if a workflow's trigger condition matches the given event payload.
 *
 * @param workflow - The workflow details, including its definition.
 * @param triggerId - The ID of the trigger being evaluated.
 * @param payload - The event payload (e.g. from emitEvent).
 * @param logger - Optional logger for evaluation errors.
 * @returns true if the workflow should run for this event, false otherwise.
 */
export declare function workflowMatchesTriggerCondition(workflow: WorkflowDetailDto, triggerId: string, payload: Record<string, unknown>, logger?: Logger): boolean;
