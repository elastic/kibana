/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildPickupMappingsQuery } from './build_pickup_mappings_query';

describe('buildPickupMappingsQuery', () => {
  describe('when no root fields have been updated', () => {
    it('builds a boolean query to select the updated types', () => {
      const query = buildPickupMappingsQuery(['type1', 'type2']);

      expect(query).toEqual({
        bool: {
          should: [{ term: { type: 'type1' } }, { term: { type: 'type2' } }],
        },
      });
    });
  });

  describe('when some root fields have been updated', () => {
    it('returns undefined', () => {
      const query = buildPickupMappingsQuery(['type1', 'type2', 'namespaces']);

      expect(query).toBeUndefined();
    });
  });
});
