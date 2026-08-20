/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { createWorkflowExecutionMetadataSchema } from './v1';

describe('createWorkflowExecutionMetadataSchema', () => {
  const schema = createWorkflowExecutionMetadataSchema({
    source: 'test-product',
    schemaVersion: 1,
    dataSchema: z.object({ entityId: z.string() }).strict(),
  });

  const validMetadata = {
    source: 'test-product' as const,
    schemaVersion: 1 as const,
    data: { entityId: 'entity-1' },
  };

  it('accepts metadata matching the product definition', () => {
    expect(schema.parse(validMetadata)).toEqual(validMetadata);
  });

  it.each([
    ['source', { ...validMetadata, source: 'another-product' }],
    ['schema version', { ...validMetadata, schemaVersion: 2 }],
    ['data', { ...validMetadata, data: { entityId: 1 } }],
  ])('rejects an invalid %s', (_, metadata) => {
    expect(schema.safeParse(metadata).success).toBe(false);
  });

  it('rejects unknown envelope fields', () => {
    expect(schema.safeParse({ ...validMetadata, entityId: 'entity-1' }).success).toBe(false);
  });
});
