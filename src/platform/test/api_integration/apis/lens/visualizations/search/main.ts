/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PUBLIC_API_PATH, PUBLIC_API_VERSION } from '@kbn/lens-plugin/server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('should get list of lens visualizations', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/visualizations`)
        .set(ELASTIC_HTTP_VERSION_HEADER, PUBLIC_API_VERSION)
        .send();

      expect(response.status).to.be(200);
      expect(response.body.length).to.be(4);
    });

    it('should filter lens visualizations by title and description', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/visualizations`)
        .query({ query: '1' })
        .set(ELASTIC_HTTP_VERSION_HEADER, PUBLIC_API_VERSION)
        .send();

      expect(response.status).to.be(200);
      expect(response.body.length).to.be(2);
    });
  });
}
