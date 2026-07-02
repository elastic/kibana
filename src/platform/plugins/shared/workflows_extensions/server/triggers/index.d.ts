import type { TriggerRegistry } from '../trigger_registry';
export { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from './workflow_execution_failed';
export type { WorkflowExecutionFailedEvent } from './workflow_execution_failed';
export { workflowExecutionFailedEventSchema } from './workflow_execution_failed';
export declare const registerInternalTriggerDefinitions: (triggerRegistry: TriggerRegistry) => void;
