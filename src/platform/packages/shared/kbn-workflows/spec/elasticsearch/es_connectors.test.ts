/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { SEARCH_CONTRACT } from './generated/elasticsearch.search.gen';
import { INDEX_CONTRACT } from './overrides/elasticsearch.index';
import { getSchemaAtPath } from '../../common/utils/zod';

describe('elasticsearch connectors', () => {
  describe('elasticsearch.search', () => {
    it('should have output schema with nestedhits property', () => {
      const outputSchema = SEARCH_CONTRACT.outputSchema;
      expect(outputSchema).toBeDefined();
      const hitsSchema = getSchemaAtPath(outputSchema, 'hits.hits');
      expect(hitsSchema.schema).toBeDefined();
      expect(hitsSchema.scopedToPath).toBe('hits.hits');
      expect(hitsSchema.schema).toBeInstanceOf(z.ZodArray);
    });
  });

  describe('elasticsearch.index', () => {
    const schema = INDEX_CONTRACT.paramsSchema;

    it('accepts a valid object document', () => {
      const result = schema.safeParse({ index: 'my-index', id: '1', document: { title: 'hello' } });
      expect(result.success).toBe(true);
    });

    it('accepts a template string document (${{ foreach.item }})', () => {
      const result = schema.safeParse({
        index: 'my-index',
        id: '1',
        document: '${{ foreach.item }}',
      });
      expect(result.success).toBe(true);
    });

    it('accepts document omitted (optional)', () => {
      const result = schema.safeParse({ index: 'my-index', id: '1' });
      expect(result.success).toBe(true);
    });

    it('rejects a malformed document (wrong value type in a key — number where record expects unknown is OK, but array-type document should fail strictObject)', () => {
      // The document field is z.record(z.string(), z.unknown()) | z.string() — an array is neither
      const result = schema.safeParse({ index: 'my-index', id: '1', document: [1, 2, 3] });
      expect(result.success).toBe(false);
    });
  });
});
