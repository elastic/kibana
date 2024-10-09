/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getResponseAggId } from './get_response_agg_config_class';

describe('getResponseAggConfigClass', () => {
  describe('getResponseAggId', () => {
    it('should generate a dot-separated ID from parent/key', () => {
      const id = getResponseAggId('parent', 'child');
      expect(id).toBe('parent.child');
    });

    it('should use brackets/quotes if the value includes a dot', () => {
      const id = getResponseAggId('parent', 'foo.bar');
      expect(id).toBe(`parent['foo.bar']`);
    });

    it('should escape quotes', () => {
      const id = getResponseAggId('parent', `foo.b'ar`);
      expect(id).toBe(`parent['foo.b\\'ar']`);
    });

    it('should escape backslashes', () => {
      const id = getResponseAggId('parent', `f\\oo.b'ar`);
      expect(id).toBe(`parent['f\\\\oo.b\\'ar']`);
    });
  });
});
