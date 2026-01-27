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
});
