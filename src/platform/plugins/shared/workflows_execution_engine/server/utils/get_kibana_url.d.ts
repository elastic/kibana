import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreStart } from '@kbn/core/server';
export declare function getKibanaUrl(coreStart?: CoreStart, cloudSetup?: CloudSetup, use_server_info?: boolean, use_localhost?: boolean): string;
export declare function buildWorkflowExecutionUrl(kibanaUrl: string, spaceId: string, workflowId: string, executionId: string, stepExecutionId?: string): string;
