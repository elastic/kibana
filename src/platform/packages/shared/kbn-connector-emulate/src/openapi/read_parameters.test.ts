/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadOperations } from './load_operations';
import type { ParameterInput } from './read_parameters';
import { readParameters } from './read_parameters';
import type { OpenApiDocument } from './types';

const strings = { type: 'array', items: { type: 'string' } };
const integers = { type: 'array', items: { type: 'integer' } };

const read = (
  parameters: Array<Record<string, unknown>>,
  input: Partial<ParameterInput>,
  document: Partial<OpenApiDocument> = {}
) => {
  const [operation] = loadOperations({
    openapi: '3.0.3',
    info: { title: 'Test', version: '1' },
    paths: { '/items/{id}': { get: { parameters, responses: { '200': { description: 'ok' } } } } },
    components: { schemas: { Limit: { type: 'integer' } } },
    ...document,
  });
  const values = readParameters(operation, {
    query: {},
    headers: {},
    pathParameters: {},
    ...input,
  });
  return Object.fromEntries(
    values.map(({ parameter, value }) => [`${parameter.in}.${parameter.name}`, value])
  );
};

describe('readParameters', () => {
  it('coerces query values to their schema types, following refs', () => {
    const parameters = [
      { name: 'limit', in: 'query', schema: { $ref: '#/components/schemas/Limit' } },
      { name: 'flag', in: 'query', schema: { type: 'boolean' } },
      { name: 'name', in: 'query', schema: { type: 'string' } },
      { name: 'size', in: 'query', schema: { oneOf: [{ type: 'integer' }, { type: 'null' }] } },
      { name: 'absent', in: 'query', schema: { type: 'integer' } },
    ];

    expect(
      read(parameters, { query: { limit: '10', flag: 'true', name: '10', size: 'big' } })
    ).toEqual({
      'query.limit': 10,
      'query.flag': true,
      'query.name': '10',
      'query.size': 'big',
      'query.absent': undefined,
    });
  });

  it('reads arrays by style and explode', () => {
    const parameters = [
      { name: 'repeated', in: 'query', schema: integers },
      { name: 'single', in: 'query', schema: strings },
      { name: 'comma', in: 'query', explode: false, schema: strings },
      { name: 'space', in: 'query', style: 'spaceDelimited', explode: false, schema: strings },
      { name: 'pipe', in: 'query', style: 'pipeDelimited', explode: false, schema: strings },
    ];
    const query = { repeated: ['1', '2'], single: 'a', comma: 'a,b', space: 'a b', pipe: 'a|b' };

    expect(read(parameters, { query })).toEqual({
      'query.repeated': [1, 2],
      'query.single': ['a'],
      'query.comma': ['a', 'b'],
      'query.space': ['a', 'b'],
      'query.pipe': ['a', 'b'],
    });
  });

  it('reads deepObject and comma-separated object parameters', () => {
    const object = { type: 'object', properties: { min: { type: 'integer' } } };
    const parameters = [
      { name: 'filter', in: 'query', style: 'deepObject', schema: object },
      { name: 'range', in: 'query', explode: false, schema: object },
    ];
    const query = { 'filter[min]': '1', 'filter[name]': 'x', range: 'min,2' };

    expect(read(parameters, { query })).toEqual({
      'query.filter': { min: 1, name: 'x' },
      'query.range': { min: 2 },
    });
  });

  it.each([
    ['simple', false, '3,4'],
    ['label', false, '.3,4'],
    ['label', true, '.3.4'],
    ['matrix', false, ';id=3,4'],
    ['matrix', true, ';id=3;id=4'],
  ])('reads %s path parameters (explode: %s)', (style, explode, value) => {
    const parameters = [
      { name: 'id', in: 'path', required: true, style, explode, schema: integers },
    ];

    expect(read(parameters, { pathParameters: { id: value } })).toEqual({ 'path.id': [3, 4] });
  });

  it('reads headers case-insensitively and cookies by name', () => {
    const parameters = [
      { name: 'X-Tags', in: 'header', schema: strings },
      { name: 'session', in: 'cookie', schema: { type: 'integer' } },
    ];
    const headers = { 'x-tags': 'a, b', cookie: 'theme=dark; session=42' };

    expect(read(parameters, { headers })).toEqual({
      'header.X-Tags': ['a', 'b'],
      'cookie.session': 42,
    });
  });

  it('reads Swagger 2.0 collection formats', () => {
    const [operation] = loadOperations({
      swagger: '2.0',
      info: { title: 'Test', version: '1' },
      produces: ['application/json'],
      paths: {
        '/items': {
          get: {
            parameters: [
              { name: 'csv', in: 'query', type: 'array', items: { type: 'string' } },
              {
                name: 'multi',
                in: 'query',
                type: 'array',
                items: { type: 'string' },
                collectionFormat: 'multi',
              },
              {
                name: 'pipes',
                in: 'query',
                type: 'array',
                items: { type: 'string' },
                collectionFormat: 'pipes',
              },
            ],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    });
    const query = { csv: 'a,b', multi: ['a', 'b'], pipes: 'a|b' };

    expect(
      readParameters(operation, { query, headers: {}, pathParameters: {} }).map(
        ({ value }) => value
      )
    ).toEqual([
      ['a', 'b'],
      ['a', 'b'],
      ['a', 'b'],
    ]);
  });
});
