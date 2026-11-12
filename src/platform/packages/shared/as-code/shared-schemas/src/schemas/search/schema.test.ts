/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeSearchRequestSchema, getAsCodeSearchRequestSchema } from './schema';

describe('getAsCodeSearchRequestSchema', () => {
  it.each(['tags', 'excluded_tags'] as const)(
    'customizes %s descriptions without changing validation or the default schema',
    (field) => {
      const descriptions = { description: 'Custom filter.', arrayDescription: 'Custom tag IDs.' };
      const schema = getAsCodeSearchRequestSchema({ [field]: descriptions });

      expect(schema.shape[field].meta()?.description).toBe(descriptions.description);
      expect(schema.shape[field].unwrap().options[1].meta()?.description).toBe(
        descriptions.arrayDescription
      );
      expect(asCodeSearchRequestSchema.shape[field].unwrap().options[1].meta()?.description).toBe(
        'Tag IDs associated with this dashboard.'
      );
      expect(asCodeSearchRequestSchema.shape[field].meta()?.description).not.toBe(
        descriptions.description
      );
      expect(schema.shape.tag_names.meta()).toEqual(
        asCodeSearchRequestSchema.shape.tag_names.meta()
      );

      for (const input of [{}, { [field]: 'tag-1' }, { [field]: ['tag-1', 'tag-2'] }]) {
        expect(schema.parse(input)).toEqual(asCodeSearchRequestSchema.parse(input));
      }
      expect(schema.safeParse({ [field]: Array(101).fill('tag-1') }).success).toBe(false);
    }
  );
});
