/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterSchema, filterWithLabelSchema } from './filter';

describe('Filter Schemas', () => {
  describe('filterSchema', () => {
    it('validates a valid KQL filter', () => {
      const input = {
        language: 'kuery' as const,
        query: 'status:active AND category:electronics',
      };

      const validated = filterSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid Lucene filter', () => {
      const input = {
        language: 'lucene' as const,
        query: 'status:active AND category:electronics',
      };

      const validated = filterSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid language', () => {
      const input = {
        language: 'invalid' as const,
        query: 'status:active',
      };

      expect(() => filterSchema.validate(input)).toThrow();
    });

    it('throws on missing query', () => {
      const input = {
        language: 'kuery' as const,
      };

      expect(() => filterSchema.validate(input)).toThrow(/\[query\]: expected value of type/);
    });
  });

  describe('filterWithLabelSchema', () => {
    it('validates a filter with label', () => {
      const input = {
        filter: {
          language: 'kuery' as const,
          query: 'status:active',
        },
        label: 'Active Status',
      };

      const validated = filterWithLabelSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a filter without label', () => {
      const input = {
        filter: {
          language: 'lucene' as const,
          query: 'status:active',
        },
      };

      const validated = filterWithLabelSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing filter', () => {
      const input = {
        label: 'Active Status',
      };

      expect(() => filterWithLabelSchema.validate(input)).toThrow();
    });

    it('throws on invalid filter', () => {
      const input = {
        filter: {
          language: 'invalid' as const,
          query: 'status:active',
        },
        label: 'Active Status',
      };

      expect(() => filterWithLabelSchema.validate(input)).toThrow();
    });

    it('validates complex KQL queries', () => {
      const input = {
        filter: {
          language: 'kuery' as const,
          query: 'status:active OR (category:electronics AND price >= 100)',
        },
        label: 'Complex Filter',
      };

      const validated = filterWithLabelSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates complex Lucene queries', () => {
      const input = {
        filter: {
          language: 'lucene' as const,
          query: 'status:active OR (category:electronics AND price:[100 TO *])',
        },
        label: 'Complex Filter',
      };

      const validated = filterWithLabelSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
