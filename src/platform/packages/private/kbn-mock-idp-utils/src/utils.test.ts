/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSAMLRequestId } from './utils';

describe('mock-idp-utils', () => {
  describe('getSAMLReuestId', () => {
    it('should extract SAMLRequest ID from URL', async () => {
      const url =
        'http://localhost:5601/mock_idp/login?SAMLRequest=fZJvT8IwEMa%2FSnPvYVsnExqGQYmRxD8Epi98Q0q5SWPXzl6H8u2dggYT4tvePc9z97sOLz4qw7boSTubQ9KNgaFVbq3tSw6PxXWnDxejIcnK8FqMm7Cxc3xrkAJrhZbEvpJD461wkjQJKyskEZRYjO9uBe%2FGovYuOOUMsDER%2BtBGXTlLTYV%2BgX6rFT7Ob3PYhFCLKDJOSbNxFEQvi5NI1joiVI3XYRd9pUVt2aykegU2aefQVobv2U%2FLK6del3pdt%2B8v2gKbTnJYxhivB6XkPDtL0wT755hgT2a9lA9kkpWDslTIy7TfthM1OLUUpA058JhnnTjpJL0iyQTvi5R3z1P%2BDGx2WPFS2z26%2F3is9k0kbopi1pk9LApgTz8naBvgAFx8p%2Ftj0v8byx%2B8MDpJYxgd%2B%2F6e9b41mk5mzmi1Y2Nj3PuVRxkwh1IaQohGB%2BHfHzD6BA%3D%3D';
      const requestId = await getSAMLRequestId(url);
      expect(requestId).toEqual('_0e0d9fa2264331e87e1e5a65329a16f9ffce2f38');
    });

    it('should return undefined if SAMLRequest parameter is missing', async () => {
      const noParamUrl = 'http://localhost:5601/mock_idp/login';
      const requestId = await getSAMLRequestId(noParamUrl);
      expect(requestId).toBeUndefined();
    });

    it('should return undefined if SAMLRequest parameter is invalid', async () => {
      const invalidUrl = 'http://localhost:5601/mock_idp/login?SAMLRequest=YmxhaCBibGFoIGJsYWg=';
      const requestId = await getSAMLRequestId(invalidUrl);
      expect(requestId).toBeUndefined();
    });
  });
});
