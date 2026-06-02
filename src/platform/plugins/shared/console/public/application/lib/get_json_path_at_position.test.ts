/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getJsonPathAtPosition } from './get_json_path_at_position';

const offsetOf = (text: string, needle: string) => text.indexOf(needle);

describe('getJsonPathAtPosition', () => {
  describe('single JSON response', () => {
    const json = JSON.stringify(
      {
        hits: {
          total: { value: 1 },
          hits: [{ _source: { name: 'foo', status: 'active' } }],
        },
      },
      null,
      2
    );

    it('returns . at the root level', () => {
      expect(getJsonPathAtPosition(json, 0)).toBe('.');
    });

    it('returns path to a top-level key', () => {
      expect(getJsonPathAtPosition(json, offsetOf(json, '"hits"'))).toBe('.hits');
    });

    it('returns path to a nested key', () => {
      expect(getJsonPathAtPosition(json, offsetOf(json, '"total"'))).toBe('.hits.total');
    });

    it('returns path to a deeply nested key', () => {
      expect(getJsonPathAtPosition(json, offsetOf(json, '"name"'))).toBe(
        '.hits.hits[0]._source.name'
      );
    });

    it('returns path including array index', () => {
      expect(getJsonPathAtPosition(json, offsetOf(json, '"_source"'))).toBe('.hits.hits[0]._source');
    });

    it('returns path to a value (not just the key)', () => {
      // offset pointing at the string value "foo"
      const offset = json.indexOf('"foo"');
      expect(getJsonPathAtPosition(json, offset)).toBe('.hits.hits[0]._source.name');
    });
  });

  describe('multi-response output (with # headers)', () => {
    const multiResponse = [
      '# 1: GET /_search [200 OK]',
      '{"acknowledged":true}',
      '# 12: PUT /test-index [200 OK]',
      JSON.stringify(
        {
          'test-index-1': { mappings: { properties: { status: { type: 'keyword' } } } },
          'test-index-2': { mappings: { properties: { status: { type: 'text' } } } },
        },
        null,
        2
      ),
    ].join('\n');

    it('returns path within the first JSON block', () => {
      const offset = multiResponse.indexOf('"acknowledged"');
      expect(getJsonPathAtPosition(multiResponse, offset)).toBe('.acknowledged');
    });

    it('returns path within a later JSON block', () => {
      const offset = multiResponse.lastIndexOf('"status"');
      expect(getJsonPathAtPosition(multiResponse, offset)).toBe(
        '.test-index-2.mappings.properties.status'
      );
    });

    it('returns path to a top-level key in the second block', () => {
      const offset = multiResponse.indexOf('"test-index-1"');
      expect(getJsonPathAtPosition(multiResponse, offset)).toBe('.test-index-1');
    });

    it('returns path to a nested key in the second block', () => {
      const offset = multiResponse.indexOf('"keyword"');
      expect(getJsonPathAtPosition(multiResponse, offset)).toBe(
        '.test-index-1.mappings.properties.status.type'
      );
    });
  });

  describe('edge cases', () => {
    it('handles an empty object', () => {
      expect(getJsonPathAtPosition('{}', 1)).toBe('.');
    });

    it('handles an array at the root', () => {
      const json = '[{"a":1},{"b":2}]';
      const offset = json.indexOf('"b"');
      expect(getJsonPathAtPosition(json, offset)).toBe('[1].b');
    });

    it('returns . when offset is at the opening brace', () => {
      expect(getJsonPathAtPosition('{"foo":"bar"}', 0)).toBe('.');
    });
  });
});
