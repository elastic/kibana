/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  RESERVED_HEADERS,
  getDefaultHeaders,
  PRODUCT_ORIGIN_HEADER,
  INTERNAL_ORIGIN_HEADER,
  USER_AGENT_HEADER,
} from './headers';

describe('Elasticsearch headers', () => {
  describe('Reserved headers', () => {
    it('contains the product-origin header', () => {
      expect(RESERVED_HEADERS).toContain(PRODUCT_ORIGIN_HEADER);
    });
    it('contains the internal-origin header', () => {
      expect(RESERVED_HEADERS).toContain(INTERNAL_ORIGIN_HEADER);
    });
    it('contains the user-agent header', () => {
      expect(RESERVED_HEADERS).toContain(USER_AGENT_HEADER);
    });
  });

  describe('getDefaultHeaders', () => {
    it('returns the default headers for the ES client', () => {
      expect(getDefaultHeaders('8.5.0')).toMatchInlineSnapshot(`
        Object {
          "user-agent": "Kibana/8.5.0",
          "x-elastic-internal-origin": "kibana",
          "x-elastic-product-origin": "kibana",
        }
      `);
    });
  });
});
