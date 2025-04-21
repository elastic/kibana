/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { type SavedObjectReference } from '@kbn/core/server';
import { PUBLIC_API_PATH } from '@kbn/dashboard-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('should return 200 with an existing dashboard', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send();

      expect(response.status).to.be(200);

      expect(response.body.item.id).to.be('be3733a0-9efe-11e7-acb3-3dab96693fab');
      expect(response.body.item.type).to.be('dashboard');
      expect(response.body.item.attributes.title).to.be('Requests');

      // Does not return unsupported options from the saved object
      expect(response.body.item.attributes.options).to.not.have.keys(['darkTheme']);
      expect(response.body.item.attributes.refreshInterval).to.not.have.keys(['display']);
    });

    it('should return 404 with a non-existing dashboard', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/does-not-exist`)
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send();

      expect(response.status).to.be(404);
    });

    it('should inject tag names into attributes', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}/8d66658a-f5b7-4482-84dc-f41d317473b8`)
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send();

      expect(response.status).to.be(200);

      expect(response.body.item.attributes.tags).to.contain('bar');
      expect(response.body.item.attributes.tags).to.contain('buzz');
      expect(response.body.item.attributes.tags).to.have.length(2);
      const referenceIds = response.body.item.references.map((ref: SavedObjectReference) => ref.id);
      expect(referenceIds).to.contain('tag-2');
      expect(referenceIds).to.contain('tag-3');
      expect(response.body.item.references).to.have.length(2);
    });
  });
}
