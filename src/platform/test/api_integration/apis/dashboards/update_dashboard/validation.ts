/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { DASHBOARD_API_PATH } from '@kbn/dashboard-plugin/server';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('validation', () => {
    it('returns error when object is not provided', async () => {
      const response = await supertest
        .put(`${DASHBOARD_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          data: {},
        });
      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.data.title]: expected value of type [string] but got [undefined]'
      );
    });

    it('returns error if panels is not an array', async () => {
      const response = await supertest
        .put(`${DASHBOARD_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          data: {
            title: 'foo',
            panels: {},
          },
        });
      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.data.panels]: expected value of type [array] but got [Object]'
      );
    });
  });
}
