import React from 'react';
import type { StepContext } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { z } from '@kbn/zod/v4';
export interface ContextOverrideData {
    stepContext: Partial<StepContext>;
    schema: z.ZodType;
    /** Original JSON Schema (avoids lossy Zod → JSON Schema round-trip for Monaco validation) */
    rawJsonSchema?: JsonModelSchemaType;
}
export interface ResumeExecutionModalProps {
    resumeMessage?: string;
    initialcontextOverride?: ContextOverrideData;
    onSubmit?: (params: {
        stepInputs: Record<string, unknown>;
    }) => void;
    onClose: () => void;
    /** When true, renders the submit button as a "Run" button (success color, play icon) instead of "Resume" */
    useRunButton?: boolean;
}
export declare const ResumeExecutionModal: React.FC<ResumeExecutionModalProps>;
