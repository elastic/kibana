/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { specFromEditor, specToEditorValue } from './editor_spec';

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
  });
});
