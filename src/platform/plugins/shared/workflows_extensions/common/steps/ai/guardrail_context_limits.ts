/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared limits for guardrail context (conversation history + attachments).
 * Used when building hook context (agent_builder) and when building the LLM
 * prompt in the ai.guardrails step so values stay in sync.
 */
export const MAX_CONVERSATION_HISTORY_MESSAGES = 20;

/** Max total character count for conversation history (e.g. 100KB). */
export const MAX_CONVERSATION_HISTORY_CHARS = 100_000;

/** Max characters per attachment's stringified data; beyond this we truncate. */
export const MAX_ATTACHMENT_DATA_CHARS = 5000;

/** Max number of attachments included in guardrail context. */
export const MAX_ATTACHMENTS = 10;
