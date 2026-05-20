import type { MessageFieldWithRole } from '@langchain/core/messages';
export declare function buildSystemPart(): MessageFieldWithRole[];
export declare function buildRequirementsPart(params: {
    maxLength?: number;
}): MessageFieldWithRole[];
export declare function buildDataPart(input: unknown): MessageFieldWithRole[];
export declare function buildInstructionsPart(instructions: string | undefined): MessageFieldWithRole[];
