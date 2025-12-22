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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const snapshot = require('./schema_snapshot.json');

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('dashboard REST schema', () => {
    /**
     * Only additive changes are allowed to Dashboard REST schemas
     *
     * This test exists to ping #kibana-presentation of any embeddable schema changes
     * since the dashboard schema includes embeddable schemas.
     *
     * If this test is failing, the changed embeddable schema needs to be be reviewed
     * to ensure its ready for public distribution.
     *
     * Once an embeddable schema has been published,
     * it can only be changed with additive changes.
     */
    it('Registered embeddable schemas have not changed', async () => {
      const response = await supertest
        .get(`/api/oas?pathStartsWith=${DASHBOARD_API_PATH}&access=internal&version=1`)
        .send();

      expect(response.status).to.be(200);
      const createBodySchema =
        response.body.paths[DASHBOARD_API_PATH].post.requestBody.content[
          'application/json; Elastic-Api-Version=1'
        ].schema;
      const panelsSchema = createBodySchema.properties.data.properties.panels;
      const panelSchema = panelsSchema.items.anyOf.find(
        (schema: any) => 'config' in schema.properties
      );
      const configSchema = panelSchema.properties.config;
      expect(configSchema.anyOf.length).to.be(2);

      // API integration tests do not support jest expect
      // so we had to roll our own toMatchSnapshot
      // To update snapshot:
      // 1) uncomment console.log
      // 2) run test
      // 3) replace snapshot file contents with copy of consoled output
      // console.log(JSON.stringify(configSchema.anyOf, null, ' '));

      expect(configSchema.anyOf).eql(snapshot);
    });
  });
}
