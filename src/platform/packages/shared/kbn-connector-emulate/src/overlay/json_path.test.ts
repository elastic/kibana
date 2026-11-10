/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { queryJsonPath } from './json_path';
import { JsonPathError } from './json_path_error';

const document = {
  paths: {
    '/1/cards': {
      get: {
        parameters: [
          { name: 'idList', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
          { name: 'x-key', in: 'header', 'x-oai-traits': { paged: false } },
        ],
      },
      post: { parameters: [{ name: 'idList', in: 'query' }] },
    },
  },
  components: {
    schemas: { Card: { type: 'object', required: ['id', 'idBoard'] } },
  },
};

const values = (path: string) => queryJsonPath(document, path).map(({ value }) => value);
const names = (path: string) =>
  queryJsonPath(document, path).map(({ value }) => (value as { name: string }).name);

describe('queryJsonPath', () => {
  it('selects by member name, quoted name, index and from the end', () => {
    expect(values('$.components.schemas.Card.required[0]')).toEqual(['id']);
    expect(values("$.paths['/1/cards'].get.parameters[-1].in")).toEqual(['header']);
    expect(values('$["components"]["schemas"].Card.type')).toEqual(['object']);
    expect(values('$')).toEqual([document]);
  });

  it('returns each node with the container and key to update or remove it by', () => {
    const [node] = queryJsonPath(document, '$.components.schemas.Card.required[1]');

    expect(node).toEqual({ value: 'idBoard', parent: ['id', 'idBoard'], key: 1 });
    expect(node.parent).toBe(document.components.schemas.Card.required);
  });

  it('selects with wildcards, unions and descendants', () => {
    expect(names("$.paths['/1/cards'].*.parameters[0]")).toEqual(['idList', 'idList']);
    expect(names("$.paths['/1/cards'].get.parameters[0, 2]")).toEqual(['idList', 'x-key']);
    expect(values('$..maximum')).toEqual([100]);
  });

  it('selects array slices', () => {
    const list = { items: [0, 1, 2, 3, 4] };
    const slice = (path: string) => queryJsonPath(list, path).map(({ value }) => value);

    expect(slice('$.items[1:]')).toEqual([1, 2, 3, 4]);
    expect(slice('$.items[:2]')).toEqual([0, 1]);
    expect(slice('$.items[-2:]')).toEqual([3, 4]);
    expect(slice('$.items[::2]')).toEqual([0, 2, 4]);
    expect(slice('$.items[::-1]')).toEqual([4, 3, 2, 1, 0]);
    expect(slice('$.items[3:0:-2]')).toEqual([3, 1]);
    expect(slice('$.items[0:5:0]')).toEqual([]);
  });

  it('filters with comparisons, boolean operators and existence tests', () => {
    const parameters = "$.paths['/1/cards'].get.parameters";

    expect(names(`${parameters}[?@.name == 'idList' && @.in == "query"]`)).toEqual(['idList']);
    expect(names(`${parameters}[?(@.name=="limit")]`)).toEqual(['limit']);
    expect(names(`${parameters}[?@.required || @.schema.maximum >= 100]`)).toEqual([
      'idList',
      'limit',
    ]);
    expect(names(`${parameters}[?!@.schema]`)).toEqual(['x-key']);
    expect(names(`${parameters}[?@.x-oai-traits.paged == false]`)).toEqual(['x-key']);
    expect(values("$.components.schemas.Card.required[?@ == 'idBoard']")).toEqual(['idBoard']);
    expect(names('$..parameters[?@.name == $.paths["/1/cards"].post.parameters[0].name]')).toEqual([
      'idList',
      'idList',
    ]);
  });

  it('selects nothing for members, indexes and filters that do not apply', () => {
    expect(values('$.components.schemas.Missing')).toEqual([]);
    expect(values('$.components.schemas.Card.required[5]')).toEqual([]);
    expect(values('$.components.schemas.Card.type.length')).toEqual([]);
    expect(values('$.components.schemas[?@.type < 5]')).toEqual([]);
  });

  it('rejects malformed and unsupported expressions with their position', () => {
    expect(() => values('paths')).toThrow(JsonPathError);
    expect(() => values('$.paths[a]')).toThrow('Unsupported selector at offset 8');
    expect(() => values('$.paths[?length(@) > 1]')).toThrow('Functions are not supported');
    expect(() => values("$.paths[?'a']")).toThrow('Expected a comparison');
    expect(() => values('$.paths[?@.schema == {"type": "string"}]')).toThrow('Expected a value');
    expect(() => values('$.paths[')).toThrow(JsonPathError);
  });
});
