import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsMeteringService } from '../metering';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
export declare function handlePostExecutionLoop({ workflowRunId, spaceId, logger, fakeRequest, workflowExecutionRepository, internalResumeWorkflowExecution, workflowTaskManager, meteringService, cloudSetup, }: {
    workflowRunId: string;
    spaceId: string;
    logger: Logger;
    fakeRequest: KibanaRequest;
    workflowExecutionRepository: WorkflowExecutionRepository;
    internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
    workflowTaskManager?: WorkflowTaskManager;
    meteringService?: WorkflowsMeteringService;
    cloudSetup?: CloudSetup;
}): Promise<void>;
