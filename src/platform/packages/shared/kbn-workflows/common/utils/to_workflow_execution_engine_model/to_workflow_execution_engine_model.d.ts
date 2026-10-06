import type { WorkflowExecutionEngineModel, WorkflowYaml } from '../../../types/v1';
import { type ManagedWorkflowFieldsSource } from '../pick_managed_workflow_fields/pick_managed_workflow_fields';
export type WorkflowExecutionEngineModelSource = {
    id: string;
    name: string;
    enabled: boolean;
    yaml: string;
    definition?: WorkflowYaml | null;
    version?: number;
} & ManagedWorkflowFieldsSource;
export type ToWorkflowExecutionEngineModelOptions = Pick<WorkflowExecutionEngineModel, 'isTestRun' | 'isEphemeral' | 'spaceId'>;
export declare const toWorkflowExecutionEngineModel: (workflow: WorkflowExecutionEngineModelSource, options?: ToWorkflowExecutionEngineModelOptions) => WorkflowExecutionEngineModel;
