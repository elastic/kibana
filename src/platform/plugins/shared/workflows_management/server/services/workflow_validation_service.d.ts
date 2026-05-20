import type { KibanaRequest } from '@kbn/core/server';
import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import type { GetAvailableConnectorsResponse } from '@kbn/workflows/types/v1';
import type { z } from '@kbn/zod/v4';
import type { WorkflowValidationDeps } from './types';
export declare class WorkflowValidationService {
    private readonly deps;
    constructor(deps: WorkflowValidationDeps);
    getAvailableConnectors(spaceId: string, request: KibanaRequest): Promise<GetAvailableConnectorsResponse>;
    validateWorkflow(yaml: string, spaceId: string, request: KibanaRequest): Promise<ValidateWorkflowResponseDto>;
    getWorkflowZodSchema(options: {
        loose?: false;
    }, spaceId: string, request: KibanaRequest): Promise<z.ZodType>;
}
