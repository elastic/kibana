import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../trigger_registry/types';
export declare const WORKFLOW_EXECUTION_FAILED_TRIGGER_ID: "workflows.failed";
export declare const workflowExecutionFailedEventSchema: z.ZodObject<{
    workflow: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        spaceId: z.ZodString;
        isErrorHandler: z.ZodBoolean;
    }, z.core.$strict>;
    execution: z.ZodObject<{
        id: z.ZodString;
        startedAt: z.ZodString;
        failedAt: z.ZodString;
    }, z.core.$strict>;
    error: z.ZodObject<{
        message: z.ZodString;
        stepId: z.ZodOptional<z.ZodString>;
        stepName: z.ZodOptional<z.ZodString>;
        stepExecutionId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type WorkflowExecutionFailedEvent = z.infer<typeof workflowExecutionFailedEventSchema>;
export declare const commonWorkflowExecutionFailedTriggerDefinition: CommonTriggerDefinition;
