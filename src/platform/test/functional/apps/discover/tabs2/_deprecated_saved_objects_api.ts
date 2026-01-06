/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedTabs } = getPageObjects([
    'discover',
    'unifiedTabs',
    'header',
    'context',
  ]);
  const esql = getService('esql');
  const supertest = getService('supertest');

  describe('deprecated saved objects API compatibility', function () {
    it('should support Discover sessions without tabs created through the deprecated saved objects API', async () => {
      await supertest
        .post(`/api/saved_objects/search`)
        .send({
          typeMigrationVersion: '10.8.0',
          attributes: {
            title: 'Legacy Discover Session',
            description: '',
            kibanaSavedObjectMeta: {
              searchSourceJSON:
                '{"query":{"esql":"FROM logstash-* | SORT @timestamp DESC | LIMIT 100"}}',
            },
            sort: [['@timestamp', 'desc']],
            columns: [],
            grid: {},
            hideChart: false,
            viewMode: 'documents',
            isTextBasedQuery: true,
            timeRestore: false,
          },
          initialNamespaces: ['default'],
          references: [],
        })
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      await discover.loadSavedSearch('Legacy Discover Session');
      await discover.waitUntilTabIsLoaded();
      expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);
      expect(await esql.getEsqlEditorQuery()).to.be(
        'FROM logstash-* | SORT @timestamp DESC | LIMIT 100'
      );
      expect(await discover.getHitCount()).to.be('100');
    });
  });
}
