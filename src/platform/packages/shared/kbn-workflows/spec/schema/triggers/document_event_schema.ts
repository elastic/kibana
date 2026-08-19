/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const DOCUMENT_EVENT_MAX_DOCUMENTS = 1000;
export const DOCUMENT_EVENT_MAX_ID_LENGTH = 1024;
export const DOCUMENT_EVENT_MAX_INDEX_LENGTH = 1024;
export const DOCUMENT_EVENT_MAX_TIMESTAMP_LENGTH = 1024;
export const DOCUMENT_EVENT_MAX_QUERY_LENGTH = 10000;
export const DOCUMENT_EVENT_MAX_DATA_VIEW_LENGTH = 1024;
export const DOCUMENT_EVENT_MAX_FIELD_NAME_LENGTH = 1024;

const documentIdSchema = z.string().min(1).max(DOCUMENT_EVENT_MAX_ID_LENGTH);
const documentIndexSchema = z.string().min(1).max(DOCUMENT_EVENT_MAX_INDEX_LENGTH);
const documentTimestampSchema = z.string().max(DOCUMENT_EVENT_MAX_TIMESTAMP_LENGTH);
const documentDataSchema = z.record(
  z.string().max(DOCUMENT_EVENT_MAX_FIELD_NAME_LENGTH),
  z.unknown()
);

const canonicalDocumentSchema = z
  .object({
    id: documentIdSchema,
    index: documentIndexSchema,
    timestamp: documentTimestampSchema.optional(),
    data: documentDataSchema,
    _id: documentIdSchema.optional(),
    _index: documentIndexSchema.optional(),
  })
  .passthrough();

const legacyDocumentSchema = z
  .object({
    _id: documentIdSchema,
    _index: documentIndexSchema,
  })
  .passthrough();

/**
 * Event payload for manually running a workflow against generic Elasticsearch documents.
 * Legacy aliases and direct source properties remain accepted during payload migration.
 */
export const DocumentEventSchema = z
  .object({
    documents: z
      .array(z.union([canonicalDocumentSchema, legacyDocumentSchema]))
      .min(1)
      .max(DOCUMENT_EVENT_MAX_DOCUMENTS),
    query: z.string().max(DOCUMENT_EVENT_MAX_QUERY_LENGTH).optional(),
    dataView: z.string().max(DOCUMENT_EVENT_MAX_DATA_VIEW_LENGTH).optional(),
    triggerType: z.literal('document').optional(),
  })
  .passthrough();

export type DocumentEvent = z.infer<typeof DocumentEventSchema>;
