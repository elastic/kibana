/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DOCUMENT_INVESTIGATION_HALF_WINDOW_MS,
  extractDocumentSeed,
  extractEntitiesFromDocument,
} from './extract_document_seed';
import { investigationSeedSchema } from './investigation_seed_schema';

describe('extractEntitiesFromDocument', () => {
  it('reads ECS fields and falls back to OTel resource.attributes and attributes fields', () => {
    expect(
      extractEntitiesFromDocument({
        'service.name': ['checkout'],
        'resource.attributes.service.environment': ['production'],
        'attributes.host.name': 'web-1',
        'container.id': 'container-9',
        'trace.id': ['trace-abc'],
      })
    ).toEqual({
      'service.name': 'checkout',
      'service.environment': 'production',
      'host.name': 'web-1',
      'container.id': 'container-9',
      'trace.id': 'trace-abc',
    });
  });
});

describe('extractDocumentSeed', () => {
  it('builds a schema-valid Discover document seed with a fixed window around the timestamp', () => {
    const center = Date.parse('2026-11-02T11:30:00.000Z');
    const seed = extractDocumentSeed({
      documentId: 'doc-42',
      flattened: {
        '@timestamp': ['2026-11-02T11:30:00.000Z'],
        'service.name': ['checkout'],
        'host.name': ['web-1'],
      },
      dataViewId: 'logs-view',
      indexPattern: 'logs-*',
    });

    expect(seed).toEqual({
      origin: { app: 'discover', surface: 'document', documentId: 'doc-42' },
      timeRange: {
        from: new Date(center - DOCUMENT_INVESTIGATION_HALF_WINDOW_MS).toISOString(),
        to: new Date(center + DOCUMENT_INVESTIGATION_HALF_WINDOW_MS).toISOString(),
      },
      filters: [],
      dataViewId: 'logs-view',
      indexPattern: 'logs-*',
      entities: {
        'service.name': 'checkout',
        'host.name': 'web-1',
      },
    });
    expect(investigationSeedSchema.safeParse(seed).success).toBe(true);
  });

  it('returns undefined when the document has no valid timestamp', () => {
    expect(
      extractDocumentSeed({
        documentId: 'doc-42',
        flattened: { 'service.name': 'checkout' },
      })
    ).toBeUndefined();
  });
});
