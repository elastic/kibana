/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';
import { createRemoveServerDefaults } from './oas_remove_server_defaults';

jest.mock('fs');

const mockedReadFileSync = jest.mocked(fs.readFileSync);

const makeSpec = (schemas: Record<string, OpenAPIV3.SchemaObject> = {}): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
  components: { schemas },
});

describe('createRemoveServerDefaults', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should remove default from properties whose names match serverDefault fields', () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        types: [
          {
            name: 'include_ccs_metadata',
            serverDefault: false,
          },
        ],
      })
    );

    const spec = makeSpec({
      SearchRequest: {
        type: 'object',
        properties: {
          include_ccs_metadata: { type: 'boolean', default: false },
          timeout: { type: 'string', default: '30s' },
        },
      },
    });

    const removeServerDefaults = createRemoveServerDefaults('/fake/schema.json');
    const result = removeServerDefaults(spec);
    const props = (result.components!.schemas!.SearchRequest as OpenAPIV3.SchemaObject).properties!;

    expect(props.include_ccs_metadata).toEqual({ type: 'boolean' });
    expect(props.timeout).toEqual({ type: 'string', default: '30s' });
  });

  it('should not remove any defaults when schema has no serverDefault fields', () => {
    mockedReadFileSync.mockReturnValue(JSON.stringify({ types: [] }));

    const spec = makeSpec({
      SearchRequest: {
        type: 'object',
        properties: {
          timeout: { type: 'string', default: '30s' },
        },
      },
    });

    const removeServerDefaults = createRemoveServerDefaults('/fake/schema.json');
    const result = removeServerDefaults(spec);
    const props = (result.components!.schemas!.SearchRequest as OpenAPIV3.SchemaObject).properties!;

    expect(props.timeout).toEqual({ type: 'string', default: '30s' });
  });

  it('should handle nested properties recursively', () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        nested: {
          deeper: [{ name: 'nested_field', serverDefault: 0 }],
        },
      })
    );

    const spec = makeSpec({
      Outer: {
        type: 'object',
        properties: {
          inner: {
            type: 'object',
            properties: {
              nested_field: { type: 'number', default: 0 },
            },
          } as unknown as OpenAPIV3.SchemaObject,
        },
      },
    });

    const removeServerDefaults = createRemoveServerDefaults('/fake/schema.json');
    const result = removeServerDefaults(spec);
    const innerProps = (
      (result.components!.schemas!.Outer as OpenAPIV3.SchemaObject).properties!
        .inner as OpenAPIV3.SchemaObject
    ).properties!;

    expect(innerProps.nested_field).toEqual({ type: 'number' });
  });

  it('should handle arrays in the spec', () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([{ name: 'arr_field', serverDefault: true }])
    );

    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            parameters: [
              {
                name: 'arr_field',
                in: 'query',
                schema: {
                  type: 'object',
                  properties: {
                    arr_field: { type: 'boolean', default: true },
                  },
                },
              },
            ],
            responses: {},
          },
        },
      },
    };

    const removeServerDefaults = createRemoveServerDefaults('/fake/schema.json');
    const result = removeServerDefaults(spec);
    const param = (result.paths['/test']!.get!.parameters![0] as OpenAPIV3.ParameterObject)
      .schema as OpenAPIV3.SchemaObject;

    expect(param.properties!.arr_field).toEqual({ type: 'boolean' });
  });

  it('should handle primitive values without recursion', () => {
    mockedReadFileSync.mockReturnValue(JSON.stringify({ name: 'some_field', serverDefault: 'x' }));

    const spec = makeSpec({
      Simple: {
        type: 'object',
        properties: {
          some_field: { type: 'string', default: 'x' },
          other: { type: 'number' },
        },
      },
    });

    const removeServerDefaults = createRemoveServerDefaults('/fake/schema.json');
    const result = removeServerDefaults(spec);
    const props = (result.components!.schemas!.Simple as OpenAPIV3.SchemaObject).properties!;

    expect(props.some_field).toEqual({ type: 'string' });
    expect(props.other).toEqual({ type: 'number' });
  });
});
