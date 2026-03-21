import type { CoreStart } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowContext } from '@kbn/workflows';
import type { ContextDependencies } from './types';
export declare function buildWorkflowContext(workflowExecution: EsWorkflowExecution, coreStart?: CoreStart, dependencies?: ContextDependencies): WorkflowContext;
