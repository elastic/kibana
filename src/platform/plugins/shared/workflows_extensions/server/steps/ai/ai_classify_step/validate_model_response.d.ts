import type { z } from '@kbn/zod/v4';
import type { AiClassifyStepOutputSchema } from '../../../../common/steps/ai';
export declare function validateModelResponse({ modelResponse, expectedCategories, fallbackCategory, responseMetadata, }: {
    modelResponse: z.infer<AiClassifyStepOutputSchema> | null | undefined;
    expectedCategories: string[];
    fallbackCategory: string | undefined;
    responseMetadata: Record<string, unknown>;
}): void;
