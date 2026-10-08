/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenAiFields, GenAiMessage } from './types';
/** Extracts and joins the content of text parts. */
export declare function getTextPartsContent(parts: unknown): string | undefined;
/**
 * Returns true if the metadata record contains any gen_ai field with an
 * actual value. Key presence alone is not enough: Discover records can carry
 * null/undefined-valued gen_ai keys for documents without GenAI data (ES|QL
 * rows are zip-padded with every result column, and _source-built records
 * keep explicit nulls).
 */
export declare function hasGenAiData(metadata: Record<string, unknown>): boolean;
export declare function parseGenAiMessages(raw: string[] | undefined): GenAiMessage[];
/**
 * Returns the full text of a message suitable for copying to the clipboard.
 * - Plain text / markdown messages: returns `content` verbatim.
 * - Newer `parts` schema: text parts verbatim, structured parts as pretty JSON,
 *   joined by a blank line so the result reads naturally.
 * - Structured messages (tool_calls, null content, etc.): whole message as pretty JSON.
 *
 * This is intentionally decoupled from the ViewMore visual collapse — it always
 * returns the complete message regardless of whether "View more" is expanded.
 */
export declare function getMessageCopyText(message: GenAiMessage): string;
export declare function getGenAiFields(metadata: Record<string, unknown>): GenAiFields;
