/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('data.search', () => {
    describe('searchSource', () => {
      const searchSourceFields = {
        highlightAll: true,
        index: '',
        query: {
          language: 'kuery',
          query: 'play_name:\\"Henry IV\\"',
        },
        version: true,
      };

      it('asScoped()', async () => {
        await supertest.get('/api/data_search_plugin/search_source/as_scoped').expect(200);
      });

      it('createEmpty()', async () => {
        await supertest
          .get('/api/data_search_plugin/search_source/create_empty')
          .expect(200)
          .expect(JSON.stringify({ searchSourceJSON: '{}', references: [] }));
      });

      it('create()', async () => {
        await supertest
          .post('/api/data_search_plugin/search_source/create')
          .set('kbn-xsrf', 'anything')
          .send(searchSourceFields)
          .expect(200)
          .expect(({ body }) => {
            const searchSourceJSON = JSON.parse(body.searchSourceJSON);
            expect(Object.keys(body)).to.eql(['searchSourceJSON', 'references']);
            expect(searchSourceJSON.query).to.eql(searchSourceFields.query);
            expect(body.references[0].type).to.equal('index-pattern');
            expect(searchSourceJSON.indexRefName).to.equal(body.references[0].name);
          });
      });
    });
  });
}
