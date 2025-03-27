/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../services/types';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('kibana server with ssl', () => {
    it('redirects http requests at redirect port to https', async () => {
      const host = process.env.TEST_KIBANA_HOST || 'localhost';
      const port = process.env.TEST_KIBANA_PORT || '5620';
      const url = `https://${host}:${port}/`;

      await supertest.get('/').expect('location', url).expect(302);
    });

    // Skips because the current version of supertest cannot follow redirects
    // Can be unskipped once https://github.com/elastic/kibana/pull/163716 is merged
    it.skip('does not boot-loop (2nd redirect points to the landing page)', async () => {
      await supertest.get('/').redirects(1).expect('location', '/spaces/enter').expect(302);
    });
  });
}
