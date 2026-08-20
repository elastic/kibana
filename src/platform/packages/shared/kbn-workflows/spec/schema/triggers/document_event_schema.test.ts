/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DOCUMENT_EVENT_MAX_DOCUMENTS,
  DOCUMENT_EVENT_MAX_ID_LENGTH,
  DOCUMENT_EVENT_MAX_QUERY_LENGTH,
  DocumentEventSchema,
} from './document_event_schema';

const canonicalDocument = {
  id: 'document-1',
  index: 'logs-*',
  timestamp: '2026-08-18T12:00:00.000Z',
  data: { message: 'hello' },
};

describe('DocumentEventSchema', () => {
  it('accepts the canonical document envelope', () => {
    expect(
      DocumentEventSchema.safeParse({
        documents: [canonicalDocument],
        query: 'message: hello',
        dataView: 'logs-*',
      }).success
    ).toBe(true);
  });

  it('accepts legacy aliases, trigger type, and direct document properties', () => {
    expect(
      DocumentEventSchema.safeParse({
        triggerType: 'document',
        documents: [
          {
            _id: 'document-1',
            _index: 'logs-*',
            '@timestamp': '2026-08-18T12:00:00.000Z',
            message: 'hello',
          },
        ],
      }).success
    ).toBe(true);
  });

  it('accepts untyped legacy source fields that collide with canonical envelope names', () => {
    expect(
      DocumentEventSchema.safeParse({
        documents: [
          {
            _id: 'document-1',
            _index: 'logs-*',
            id: 42,
            index: { source: true },
            timestamp: 1_776_508_800_000,
            data: 'legacy source value',
          },
        ],
      }).success
    ).toBe(true);
  });

  it('requires at least one document', () => {
    expect(DocumentEventSchema.safeParse({ documents: [] }).success).toBe(false);
  });

  it('bounds the document count', () => {
    expect(
      DocumentEventSchema.safeParse({
        documents: Array.from(
          { length: DOCUMENT_EVENT_MAX_DOCUMENTS + 1 },
          () => canonicalDocument
        ),
      }).success
    ).toBe(false);
  });

  it('bounds typed strings', () => {
    expect(
      DocumentEventSchema.safeParse({
        documents: [{ ...canonicalDocument, id: 'a'.repeat(DOCUMENT_EVENT_MAX_ID_LENGTH + 1) }],
      }).success
    ).toBe(false);
    expect(
      DocumentEventSchema.safeParse({
        documents: [canonicalDocument],
        query: 'a'.repeat(DOCUMENT_EVENT_MAX_QUERY_LENGTH + 1),
      }).success
    ).toBe(false);
  });
});
