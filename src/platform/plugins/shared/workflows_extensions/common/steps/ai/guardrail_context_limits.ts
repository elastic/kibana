/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared limits for guardrail context (conversation history for hook + ai.guardrail step).
 */
export const MAX_CONVERSATION_HISTORY_MESSAGES = 20;

/** Max estimated tokens for conversation history (hook + step prompt). */
export const MAX_CONVERSATION_HISTORY_TOKENS = 100_000;

/** Max characters per attachment's stringified data; beyond this we truncate. */
export const MAX_ATTACHMENT_DATA_CHARS = 5000;

/** Max number of attachments included in guardrail-related context. */
export const MAX_ATTACHMENTS = 10;
