/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const ATTRIBUTE_GEN_AI_OPERATION_NAME = 'attributes.gen_ai.operation.name';
export declare const ATTRIBUTE_GEN_AI_PROVIDER_NAME = 'attributes.gen_ai.provider.name';
export declare const ATTRIBUTE_GEN_AI_SYSTEM = 'attributes.gen_ai.system';
export declare const ATTRIBUTE_GEN_AI_REQUEST_MODEL = 'attributes.gen_ai.request.model';
export declare const ATTRIBUTE_GEN_AI_REQUEST_TEMPERATURE = 'attributes.gen_ai.request.temperature';
export declare const ATTRIBUTE_GEN_AI_REQUEST_TOP_P = 'attributes.gen_ai.request.top_p';
export declare const ATTRIBUTE_GEN_AI_REQUEST_TOP_K = 'attributes.gen_ai.request.top_k';
export declare const ATTRIBUTE_GEN_AI_REQUEST_MAX_TOKENS = 'attributes.gen_ai.request.max_tokens';
export declare const ATTRIBUTE_GEN_AI_REQUEST_SEED = 'attributes.gen_ai.request.seed';
export declare const ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS = 'attributes.gen_ai.usage.input_tokens';
export declare const ATTRIBUTE_GEN_AI_USAGE_OUTPUT_TOKENS = 'attributes.gen_ai.usage.output_tokens';
export declare const ATTRIBUTE_GEN_AI_RESPONSE_MODEL = 'attributes.gen_ai.response.model';
export declare const ATTRIBUTE_GEN_AI_RESPONSE_ID = 'attributes.gen_ai.response.id';
export declare const ATTRIBUTE_GEN_AI_RESPONSE_FINISH_REASONS =
  'attributes.gen_ai.response.finish_reasons';
export declare const ATTRIBUTE_GEN_AI_INPUT_MESSAGES = 'attributes.gen_ai.input.messages';
export declare const ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES = 'attributes.gen_ai.output.messages';
export declare const ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS = 'attributes.gen_ai.system_instructions';
export declare const ATTRIBUTE_GEN_AI_CONVERSATION_ID = 'attributes.gen_ai.conversation.id';
export declare const ATTRIBUTE_GEN_AI_TOOL_DEFINITIONS = 'attributes.gen_ai.tool.definitions';
export declare const ATTRIBUTE_GEN_AI_TOOL_NAME = 'attributes.gen_ai.tool.name';
export declare const ATTRIBUTE_GEN_AI_TOOL_CALL_ARGUMENTS = 'attributes.gen_ai.tool.call.arguments';
export declare const ATTRIBUTE_GEN_AI_TOOL_CALL_RESULT = 'attributes.gen_ai.tool.call.result';
/** Standard role values for GenAI messages (OTel semantic conventions). */
export declare const GEN_AI_MESSAGE_ROLES: {
  readonly USER: 'user';
  readonly ASSISTANT: 'assistant';
  readonly SYSTEM: 'system';
  readonly TOOL: 'tool';
};
export declare const ATTRIBUTE_GEN_AI_PROMPT = 'attributes.gen_ai.prompt';
export declare const ATTRIBUTE_GEN_AI_COMPLETION = 'attributes.gen_ai.completion';
/**
 * All fields that carry input messages, in priority order (first match wins).
 * OTel standard takes precedence; non-standard provider fields follow as fallbacks.
 */
export declare const GEN_AI_INPUT_MESSAGE_FIELDS: readonly [
  'attributes.gen_ai.input.messages',
  'attributes.gen_ai.prompt'
];
/**
 * All fields that carry output messages, in priority order (first match wins).
 * OTel standard takes precedence; non-standard provider fields follow as fallbacks.
 */
export declare const GEN_AI_OUTPUT_MESSAGE_FIELDS: readonly [
  'attributes.gen_ai.output.messages',
  'attributes.gen_ai.completion'
];
/**
 * GenAI fields whose values regularly exceed the `ignore_above: 1024` limit of
 * the `attributes.*` keyword mappings. The ES fields API omits ignored values
 * (the doc lists them under `_ignored`), so these must be read from `_source`.
 *
 * Used by both the browser (field recovery in the GenAI tab) and the server
 * (APM plugin `mergeLongFieldsFromSource`).
 */
export declare const GEN_AI_LONG_MESSAGE_FIELDS: string[];
