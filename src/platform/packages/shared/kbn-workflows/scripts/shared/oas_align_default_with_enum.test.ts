/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { alignDefaultWithEnum } from './oas_align_default_with_enum';

const makeDocument = (
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {}
): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
  components: { schemas },
});

describe('alignDefaultWithEnum', () => {
  it('should return document as-is when components.schemas is missing', () => {
    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };
    expect(alignDefaultWithEnum(doc)).toBe(doc);
  });

  it('should extend the enum for matching schema key with deduplication', () => {
    const doc = makeDocument({
      'ingest._types.UserAgentProperty': {
        type: 'string',
        enum: ['name', 'os', 'custom_value'],
      },
    });

    const result = alignDefaultWithEnum(doc);
    const schema = result.components!.schemas![
      'ingest._types.UserAgentProperty'
    ] as OpenAPIV3.SchemaObject;

    // The current implementation wraps the deduped array inside another array
    expect(schema.enum).toBeDefined();
    const flatEnum = schema.enum!.flat();
    expect(flatEnum).toContain('name');
    expect(flatEnum).toContain('os');
    expect(flatEnum).toContain('custom_value');
    expect(flatEnum).toContain('major');
    expect(flatEnum).toContain('device');
    // Verify deduplication: 'name' and 'os' appear only once
    expect(flatEnum.filter((v: string) => v === 'name')).toHaveLength(1);
  });

  it('should leave non-matching schema keys unchanged', () => {
    const originalSchema: OpenAPIV3.SchemaObject = { type: 'string', enum: ['a', 'b'] };
    const doc = makeDocument({ 'some.other.Type': originalSchema });

    alignDefaultWithEnum(doc);

    expect(doc.components!.schemas!['some.other.Type']).toBe(originalSchema);
  });

  it('should leave $ref schemas unchanged', () => {
    const refSchema: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/Other' };
    const doc = makeDocument({ 'ingest._types.UserAgentProperty': refSchema });

    alignDefaultWithEnum(doc);

    expect(doc.components!.schemas!['ingest._types.UserAgentProperty']).toBe(refSchema);
  });

  it('should leave matching key unchanged when schema has no enum property', () => {
    const schema: OpenAPIV3.SchemaObject = { type: 'string' };
    const doc = makeDocument({ 'ingest._types.UserAgentProperty': schema });

    alignDefaultWithEnum(doc);

    expect(doc.components!.schemas!['ingest._types.UserAgentProperty']).toBe(schema);
  });
});
