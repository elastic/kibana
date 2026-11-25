/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEsqlQueriesFromSpec, parseSpec, specFromEditor, specToEditorValue } from './spec';

describe('editor spec', () => {
  describe('specToEditorValue', () => {
    it('shows an HJSON spec as is', () => {
      expect(specToEditorValue({ format: 'hjson', value: '{ mark: bar }' })).toBe('{ mark: bar }');
    });

    it('pretty prints a JSON spec', () => {
      expect(specToEditorValue({ format: 'json', value: { mark: 'bar' } })).toBe(
        '{\n  "mark": "bar"\n}'
      );
    });
  });

  describe('specFromEditor', () => {
    it('keeps HJSON text as an HJSON spec', () => {
      expect(specFromEditor('{ mark: bar }', 'hjson')).toEqual({
        format: 'hjson',
        value: '{ mark: bar }',
      });
    });

    it('parses JSON text into a JSON spec', () => {
      expect(specFromEditor('{"mark":"bar"}', 'json')).toEqual({
        format: 'json',
        value: { mark: 'bar' },
      });
    });

    it('falls back to an HJSON spec while the JSON text does not parse', () => {
      expect(specFromEditor('{"mark":', 'json')).toEqual({ format: 'hjson', value: '{"mark":' });
    });

    it('falls back to an HJSON spec when the JSON text is not an object', () => {
      expect(specFromEditor('null', 'json')).toEqual({ format: 'hjson', value: 'null' });
      expect(specFromEditor('[1]', 'json')).toEqual({ format: 'hjson', value: '[1]' });
    });
  });

  describe('parseSpec', () => {
    it('returns a JSON spec as is', () => {
      expect(parseSpec({ format: 'json', value: { mark: 'bar' } })).toEqual({ mark: 'bar' });
    });

    it('parses an HJSON spec', () => {
      expect(parseSpec({ format: 'hjson', value: '{\n  mark: bar\n}' })).toEqual({ mark: 'bar' });
    });

    it('returns undefined for HJSON that does not parse', () => {
      expect(parseSpec({ format: 'hjson', value: '{ mark: ' })).toBeUndefined();
    });

    it('returns undefined for HJSON without root braces', () => {
      expect(parseSpec({ format: 'hjson', value: 'mark: bar' })).toBeUndefined();
    });
  });

  describe('getEsqlQueriesFromSpec', () => {
    it('returns the query from a single ES|QL data source', () => {
      const spec = {
        data: {
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz',
          },
        },
      };

      expect(getEsqlQueriesFromSpec(spec)).toEqual([
        'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz',
      ]);
    });

    it('returns every ES|QL query from a multi-source spec', () => {
      const spec = {
        data: [
          {
            url: {
              '%type%': 'elasticsearch',
              index: 'logs-*',
            },
          },
          {
            url: {
              '%type%': 'esql',
              query: 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz',
            },
          },
          {
            url: {
              '%type%': 'esql',
              query: 'FROM logs-* | WHERE color.keyword == ?color',
            },
          },
        ],
      };

      expect(getEsqlQueriesFromSpec(spec)).toEqual([
        'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz',
        'FROM logs-* | WHERE color.keyword == ?color',
      ]);
    });

    it('returns an empty array when there is no ES|QL source', () => {
      expect(getEsqlQueriesFromSpec({})).toEqual([]);
    });

    it('ignores a data url that is a string', () => {
      expect(getEsqlQueriesFromSpec({ data: { url: 'https://example.com/data.json' } })).toEqual(
        []
      );
    });
  });
});
