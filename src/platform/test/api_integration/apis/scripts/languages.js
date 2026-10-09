/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION } from '@kbn/data-plugin/common/constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  // Migration recommendation: REPLACE WITH UNIT/JEST
  // Route returns a hardcoded list; a Jest route test (or deletion) is enough. Delete the `it.skip` test.
  // Target: src/platform/plugins/shared/data/server/scripts/route.test.ts (new)
  describe('Script Languages API', function getLanguages() {
    it('should return 200 with an array of languages', () =>
      supertest
        .get('/internal/scripts/languages')
        .set(ELASTIC_HTTP_VERSION_HEADER, SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((response) => {
          expect(response.body).to.be.an('array');
        }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should only return langs enabled for inline scripting', () =>
      supertest
        .get('/internal/scripts/languages')
        .set(ELASTIC_HTTP_VERSION_HEADER, SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((response) => {
          expect(response.body).to.contain('expression');
          expect(response.body).to.contain('painless');
          expect(response.body).to.not.contain('groovy');
        }));
  });
}
