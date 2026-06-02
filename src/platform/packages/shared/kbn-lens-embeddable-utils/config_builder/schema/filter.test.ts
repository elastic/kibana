/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectPrettyError } from '@kbn/zod-helpers/v4';
import { filterSchema, filterWithLabelSchema } from './filter';

describe('Filter Schemas', () => {
  describe('filterSchema', () => {
    it('validates a valid KQL filter', () => {
      const input = {
        language: 'kql',
        expression: 'status:active AND category:electronics',
      };

      const validated = filterSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid Lucene filter', () => {
      const input = {
        language: 'lucene',
        expression: 'status:active AND category:electronics',
      };

      const validated = filterSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid language', () => {
      const input = {
        language: 'invalid',
        expression: 'status:active',
      };

      const result = filterSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at language"
      `);
    });

    it('throws on missing expression', () => {
      const input = {
        language: 'kql',
      };

      const result = filterSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at expression"
      `);
    });
  });

  describe('filterWithLabelSchema', () => {
    it('validates a filter with label', () => {
      const input = {
        filter: {
          language: 'kql',
          expression: 'status:active',
        },
        label: 'Active Status',
      };

      const validated = filterWithLabelSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates a filter without label', () => {
      const input = {
        filter: {
          language: 'lucene',
          expression: 'status:active',
        },
      };

      const validated = filterWithLabelSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing filter', () => {
      const input = {
        label: 'Active Status',
      };

      const result = filterWithLabelSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input: expected object, received undefined
          → at filter"
      `);
    });

    it('throws on invalid filter', () => {
      const input = {
        filter: {
          language: 'invalid',
          expression: 'status:active',
        },
        label: 'Active Status',
      };

      const result = filterWithLabelSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at filter.language"
      `);
    });

    it('validates complex KQL queries', () => {
      const input = {
        filter: {
          language: 'kql',
          expression: 'status:active OR (category:electronics AND price >= 100)',
        },
        label: 'Complex Filter',
      };

      const validated = filterWithLabelSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates complex Lucene queries', () => {
      const input = {
        filter: {
          language: 'lucene',
          expression: 'status:active OR (category:electronics AND price:[100 TO *])',
        },
        label: 'Complex Filter',
      };

      const validated = filterWithLabelSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });
});
