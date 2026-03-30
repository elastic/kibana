/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('Deprecation warning header encoding', () => {
    it('doesnt crash and returns an encoded warning header for a non-ASCII deprecation message', async () => {
      await supertest
        .get('/api/core_http/non_ascii_deprecated_route')
        .expect(200)
        .then((response) => {
          const warning = response.headers.warning;
          expect(warning).to.match(/^299 Kibana-/);
        });
    });
  });
}
