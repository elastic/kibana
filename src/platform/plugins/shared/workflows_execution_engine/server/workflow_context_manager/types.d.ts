import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { WorkflowRepository } from '@kbn/workflows';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { WorkflowLogEvent } from '../repositories/logs_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../types';
export interface ContextDependencies {
    cloudSetup: CloudSetup | undefined;
    coreStart: CoreStart;
    actions: ActionsPluginStartContract;
    taskManager: TaskManagerStartContract;
    workflowsExtensions: WorkflowsExtensionsServerPluginStart;
    config: WorkflowsExecutionEngineConfig;
    workflowRepository?: WorkflowRepository;
    workflowExecutionRepository?: WorkflowExecutionRepository;
    stepExecutionRepository?: StepExecutionRepository;
    workflowsExecutionEngine?: WorkflowsExecutionEnginePluginStart;
    spaceId?: string;
    request?: KibanaRequest;
}
/**
 * Interface for workflow context manager logging capabilities
 * Used by runtime manager to avoid circular dependencies
 *
 * Simplified interface focusing on actual logging needs
 */
export interface IWorkflowContextLogger {
    logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
    logError(message: string, error?: Error, additionalData?: Partial<WorkflowLogEvent>): void;
    logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
    logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
    startTiming(event: WorkflowLogEvent): void;
    stopTiming(event: WorkflowLogEvent): void;
    logWorkflowStart(): void;
    logWorkflowComplete(success?: boolean): void;
    logStepStart(stepId: string, stepName?: string): void;
    logStepComplete(stepId: string, stepName?: string, success?: boolean): void;
}
