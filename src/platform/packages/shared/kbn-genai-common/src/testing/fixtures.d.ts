import type { GenAiMessage } from '../genai/types';
export interface GenAiFieldFixture {
    source: Record<string, unknown>;
    expectedMessages: GenAiMessage[];
}
export declare const GEN_AI_INPUT_FIELD_FIXTURES: Record<string, GenAiFieldFixture>;
export declare const GEN_AI_OUTPUT_FIELD_FIXTURES: Record<string, GenAiFieldFixture>;
