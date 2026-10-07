/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadContractOperations } from '@kbn/connector-contract-mock';
import type { LoadDocument } from './bundle_spec';
import { bundleSpec } from './bundle_spec';

const ROOT = 'https://example.com/api/openapi.yaml';

const loaderFor = (files: Record<string, unknown>) => {
  const load = jest.fn<ReturnType<LoadDocument>, Parameters<LoadDocument>>(async (url) => {
    if (!(url in files)) {
      throw new Error('404 Not Found');
    }
    return files[url];
  });
  return load;
};

const ok = (schema: unknown) => ({
  description: 'ok',
  content: { 'application/json': { schema } },
});

describe('bundleSpec', () => {
  it('inlines external refs into components, following refs in the inlined parts', async () => {
    const document = {
      openapi: '3.0.3',
      info: { title: 'Pets', version: '1' },
      paths: {
        '/pets': {
          get: {
            parameters: [{ $ref: 'parameters.yaml#/limit' }],
            responses: {
              '200': ok({ $ref: 'schemas/pet.yaml' }),
              default: {
                $ref: 'https://example.com/shared/common.yaml#/components/responses/Error',
              },
            },
          },
        },
        '/owners': { $ref: 'paths/owners.yaml' },
      },
      components: { schemas: { Local: { type: 'string' } } },
    };
    const load = loaderFor({
      'https://example.com/api/parameters.yaml': {
        limit: { name: 'limit', in: 'query', schema: { type: 'integer' } },
      },
      'https://example.com/api/schemas/pet.yaml': {
        type: 'object',
        properties: { owner: { $ref: 'owner.yaml' }, kind: { $ref: '#/$defs/Kind' } },
        $defs: { Kind: { enum: ['cat', 'dog'] } },
      },
      'https://example.com/api/schemas/owner.yaml': {
        type: 'object',
        properties: { pets: { type: 'array', items: { $ref: 'pet.yaml' } } },
      },
      'https://example.com/shared/common.yaml': {
        components: {
          responses: { Error: ok({ $ref: '#/components/schemas/Error' }) },
          schemas: { Error: { type: 'object' } },
        },
      },
      'https://example.com/api/paths/owners.yaml': {
        get: { responses: { '200': ok({ $ref: '../schemas/owner.yaml' }) } },
      },
    });

    const bundled = await bundleSpec(document, { url: ROOT, load });

    expect(bundled.paths).toEqual({
      '/pets': {
        get: {
          parameters: [{ $ref: '#/components/parameters/limit' }],
          responses: {
            '200': ok({ $ref: '#/components/schemas/pet' }),
            default: { $ref: '#/components/responses/Error' },
          },
        },
      },
      '/owners': {
        get: { responses: { '200': ok({ $ref: '#/components/schemas/owner' }) } },
      },
    });
    expect(bundled.components).toEqual({
      parameters: { limit: { name: 'limit', in: 'query', schema: { type: 'integer' } } },
      responses: { Error: ok({ $ref: '#/components/schemas/Error' }) },
      schemas: {
        Local: { type: 'string' },
        pet: {
          type: 'object',
          properties: {
            owner: { $ref: '#/components/schemas/owner' },
            kind: { $ref: '#/components/schemas/Kind' },
          },
          $defs: { Kind: { enum: ['cat', 'dog'] } },
        },
        owner: {
          type: 'object',
          properties: {
            pets: { type: 'array', items: { $ref: '#/components/schemas/pet' } },
          },
        },
        Kind: { enum: ['cat', 'dog'] },
        Error: { type: 'object' },
      },
    });
    expect(loadContractOperations(bundled)).toHaveLength(2);
  });

  it('loads each document once', async () => {
    const document = {
      openapi: '3.0.3',
      paths: {
        '/a': { get: { responses: { '200': ok({ $ref: 'models.yaml#/A' }) } } },
        '/b': { get: { responses: { '200': ok({ $ref: 'models.yaml#/B' }) } } },
      },
    };
    const load = loaderFor({
      'https://example.com/api/models.yaml': { A: { type: 'string' }, B: { $ref: '#/A' } },
    });

    const bundled = await bundleSpec(document, { url: ROOT, load });

    expect(load).toHaveBeenCalledTimes(1);
    expect(bundled.components).toEqual({
      schemas: { A: { type: 'string' }, B: { $ref: '#/components/schemas/A' } },
    });
  });

  it('prefixes names that collide with the file path', async () => {
    const document = {
      openapi: '3.0.3',
      paths: { '/a': { get: { responses: { '200': ok({ $ref: 'v2/models.yaml#/Item' }) } } } },
      components: { schemas: { Item: { type: 'string' } } },
    };
    const load = loaderFor({
      'https://example.com/api/v2/models.yaml': { Item: { type: 'object' } },
    });

    const bundled = await bundleSpec(document, { url: ROOT, load });

    expect(bundled.components).toHaveProperty(['schemas', 'Item'], { type: 'string' });
    expect(bundled.components).toHaveProperty(['schemas', 'v2_models_Item'], { type: 'object' });
  });

  it('rewrites refs back into the root document as local refs', async () => {
    const document = {
      openapi: '3.0.3',
      paths: { '/a': { get: { responses: { '200': ok({ $ref: 'wrapper.yaml' }) } } } },
      components: { schemas: { Item: { type: 'string' } } },
    };
    const load = loaderFor({
      'https://example.com/api/wrapper.yaml': {
        type: 'array',
        items: { $ref: 'openapi.yaml#/components/schemas/Item' },
      },
    });

    const bundled = await bundleSpec(document, { url: ROOT, load });

    expect(bundled.components).toHaveProperty('schemas.wrapper.items', {
      $ref: '#/components/schemas/Item',
    });
  });

  it('leaves documents without external refs as they are', async () => {
    const document = {
      openapi: '3.0.3',
      paths: { '/a': { get: { responses: { '200': ok({ $ref: '#/components/schemas/A' }) } } } },
      components: { schemas: { A: { type: 'string' } } },
    };

    expect(await bundleSpec(document, { url: ROOT, load: loaderFor({}) })).toEqual(document);
  });

  it.each([
    ['a document that fails to load', 'missing.yaml', /Cannot load .*missing\.yaml.*404 Not Found/],
    [
      'a pointer that resolves to nothing',
      'models.yaml#/Nope',
      /Cannot resolve \$ref models\.yaml#\/Nope at \/paths/,
    ],
  ])('names the ref and its location for %s', async (_, ref, message) => {
    const document = {
      openapi: '3.0.3',
      paths: { '/a': { get: { responses: { '200': ok({ $ref: ref }) } } } },
    };
    const load = loaderFor({ 'https://example.com/api/models.yaml': {} });

    await expect(bundleSpec(document, { url: ROOT, load })).rejects.toThrow(message);
  });
});
