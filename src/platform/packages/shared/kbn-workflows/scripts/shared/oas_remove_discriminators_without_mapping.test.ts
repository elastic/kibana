/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { removeDiscriminatorsWithoutMapping } from './oas_remove_discriminators_without_mapping';

const makeDocument = (
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {}
): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
  components: { schemas },
});

describe('removeDiscriminatorsWithoutMapping', () => {
  it('should return document as-is when components.schemas is missing', () => {
    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };
    expect(removeDiscriminatorsWithoutMapping(doc)).toBe(doc);
  });

  it('should remove discriminator when it has no mapping', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const doc = makeDocument({
      MySchema: {
        oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        discriminator: { propertyName: 'kind' },
      },
    });

    removeDiscriminatorsWithoutMapping(doc);
    const schema = doc.components!.schemas!.MySchema as OpenAPIV3.SchemaObject;

    expect(schema.discriminator).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MySchema'));
    warnSpy.mockRestore();
  });

  it('should preserve discriminator when it has a mapping', () => {
    const doc = makeDocument({
      MySchema: {
        oneOf: [{ $ref: '#/components/schemas/A' }],
        discriminator: {
          propertyName: 'kind',
          mapping: { a: '#/components/schemas/A' },
        },
      },
    });

    removeDiscriminatorsWithoutMapping(doc);
    const schema = doc.components!.schemas!.MySchema as OpenAPIV3.SchemaObject;

    expect(schema.discriminator).toBeDefined();
    expect(schema.discriminator!.mapping).toEqual({ a: '#/components/schemas/A' });
  });

  it('should leave $ref schemas unchanged', () => {
    const refSchema: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/Other' };
    const doc = makeDocument({ MySchema: refSchema });

    removeDiscriminatorsWithoutMapping(doc);

    expect(doc.components!.schemas!.MySchema).toBe(refSchema);
  });
});
