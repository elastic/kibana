/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_CONTRACT } from './overrides/elasticsearch.search';

// Every case is a body that Elasticsearch accepts. The parsed output must equal the input:
// zod strips unknown keys, and the server stores and runs the parsed output.
const ACCEPTED_BODIES: Record<string, Record<string, unknown>> = {
  'term full form': { query: { term: { status_code: { value: 500 } } } },
  'term shortcut, string': { query: { term: { 'host.name': 'web-01' } } },
  'term shortcut, number': { query: { term: { status_code: 500 } } },
  'term shortcut, boolean': { query: { term: { success: true } } },
  'match shortcut, string': { query: { match: { message: 'connection' } } },
  'match shortcut, number': { query: { match: { status_code: 500 } } },
  'match shortcut, boolean': { query: { match: { success: false } } },
  'match_phrase shortcut': { query: { match_phrase: { message: 'connection refused' } } },
  'match_phrase_prefix shortcut': { query: { match_phrase_prefix: { message: 'conn ref' } } },
  'match_bool_prefix shortcut': { query: { match_bool_prefix: { message: 'conn ti' } } },
  'prefix shortcut': { query: { prefix: { 'host.name': 'web' } } },
  'wildcard shortcut': { query: { wildcard: { 'host.name': 'web-*' } } },
  'regexp shortcut': { query: { regexp: { 'host.name': 'db-[0-9]+' } } },
  'fuzzy shortcut': { query: { fuzzy: { 'user.name': 'kiril' } } },
  'span_term shortcut': { query: { span_term: { message: 'connection' } } },
  'script shortcut in a script query': {
    query: { bool: { filter: { script: { script: "doc['bytes'].value > 1000" } } } },
  },
  'script shortcut in script_fields': {
    script_fields: { kb: { script: "doc['bytes'].value / 1024.0" } },
  },
  'fields shortcut': { fields: ['host.name', 'status_code'] },
  '_source string': { _source: 'host.*' },
  '_source array': { _source: ['host.name', 'message'] },
  '_source object': { _source: { includes: ['host.*', 'message'], excludes: ['host.ip'] } },
  '_source object with include alias': { _source: { include: ['host.*'] } },
  'docvalue_fields with format': {
    docvalue_fields: ['host.name', { field: '@timestamp', format: 'epoch_millis' }],
  },
  'runtime_mappings script, full form': {
    runtime_mappings: {
      kb: {
        type: 'double',
        script: { source: "emit(doc['bytes'].value / 1024.0)", lang: 'painless' },
      },
    },
  },
  'field sort inside collapse.inner_hits': {
    collapse: {
      field: 'id',
      inner_hits: { name: 'latest', size: 1, sort: [{ updated_at: 'desc' }] },
    },
  },
  'field sort inside top_hits': {
    size: 0,
    aggregations: {
      latest: { top_hits: { size: 1, sort: [{ '@timestamp': { order: 'desc' } }] } },
    },
  },
  'geo_distance query': {
    query: { geo_distance: { distance: '10km', 'source.geo.location': { lat: 52.5, lon: 13.4 } } },
  },
  'geo_bounding_box query': {
    query: {
      geo_bounding_box: {
        'source.geo.location': { top_left: [13.0, 53.0], bottom_right: [14.0, 52.0] },
      },
    },
  },
  'geo_shape query': {
    query: {
      geo_shape: {
        area: {
          shape: {
            type: 'envelope',
            coordinates: [
              [13.0, 53.0],
              [14.0, 52.0],
            ],
          },
          relation: 'within',
        },
      },
    },
  },
  'suggest with a named suggester': {
    suggest: { text: 'conection', fix_typo: { term: { field: 'message' } } },
  },
  'script with scalar params': {
    script_fields: {
      kb: { script: { source: "doc['bytes'].value / params.d", params: { d: 1024, on: true } } },
    },
  },
  'script with templated params': {
    script_fields: {
      kb: { script: { source: "doc['bytes'].value / params.d", params: { d: '{{ inputs.d }}' } } },
    },
  },
  'aggs alias': { size: 0, aggs: { by_host: { terms: { field: 'host.name' } } } },
  'aggs alias in sub-aggregations': {
    size: 0,
    aggregations: {
      by_host: { terms: { field: 'host.name' }, aggs: { avg_bytes: { avg: { field: 'bytes' } } } },
    },
  },
};

describe('elasticsearch.search params schema', () => {
  const { paramsSchema } = SEARCH_CONTRACT;

  it.each(Object.entries(ACCEPTED_BODIES))('keeps the body intact: %s', (_name, body) => {
    const params = { index: 'logs', ...body };
    const result = paramsSchema.safeParse(params);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(params);
  });

  it('rejects span_term with neither value nor its term alias', () => {
    const result = paramsSchema.safeParse({ index: 'logs', query: { span_term: { message: {} } } });

    expect(result.success).toBe(false);
  });

  it('rejects the function_score array form, which Elasticsearch rejects', () => {
    const result = paramsSchema.safeParse({
      index: 'logs',
      query: { function_score: [{ weight: 2 }] },
    });

    expect(result.success).toBe(false);
  });
});
