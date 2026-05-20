import type { MessageFieldWithRole } from '@langchain/core/messages';
export declare function buildSystemPart(): MessageFieldWithRole[];
export declare function buildDataPart(input: unknown): MessageFieldWithRole[];
export declare function buildInstructionsPart(instructions: string | undefined): MessageFieldWithRole[];
export declare function buildClassificationRequestPart(params: {
    categories: string[];
    allowMultipleCategories: boolean;
    fallbackCategory?: string;
    includeRationale: boolean;
}): MessageFieldWithRole[];
