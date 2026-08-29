/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';

const HIDDEN_TYPES = ['test-hidden-importable-exportable', 'test-hidden-non-importable-exportable'];

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('find', () => {
    before(async () => {
      await esArchiver.load(
        'src/platform/test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/saved_objects_management/hidden_saved_objects'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
      );
      await kibanaServer.savedObjects.clean({
        types: ['test-hidden-importable-exportable'],
      });
    });

    it('returns empty response for importableAndExportable types', async () =>
      await supertest
        .get('/api/saved_objects/_find?type=test-hidden-importable-exportable')
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });
        }));

    it('returns empty response for non importableAndExportable types', async () =>
      await supertest
        .get('/api/saved_objects/_find?type=test-hidden-non-importable-exportable')
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });
        }));

    describe('aggregations against documents that exist in Elasticsearch', () => {
      let configTotal: number;

      const findWithHiddenTypes = (aggs: Record<string, unknown>) => {
        const types = ['config', ...HIDDEN_TYPES].map((type) => `type=${type}`).join('&');
        return supertest
          .get(
            `/api/saved_objects/_find?${types}&per_page=0&aggs=${encodeURIComponent(
              JSON.stringify(aggs)
            )}`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      };

      before(async () => {
        const { hits } = await es.search({
          index: MAIN_SAVED_OBJECT_INDEX,
          size: 0,
          query: { terms: { type: HIDDEN_TYPES } },
          track_total_hits: true,
        });
        const hiddenCount = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;
        expect(hiddenCount).to.be.greaterThan(0);

        const { body } = await supertest
          .get('/api/saved_objects/_find?type=config&per_page=0')
          .set('kbn-xsrf', 'true')
          .expect(200);
        configTotal = body.total;
      });

      it('does not include hidden types in a terms aggregation', async () => {
        const { body } = await findWithHiddenTypes({
          all_types: { terms: { field: 'type', size: 50 } },
        });

        expect(body).to.eql({
          aggregations: {
            all_types: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'config', doc_count: configTotal }],
            },
          },
          page: 1,
          per_page: 0,
          saved_objects: [],
          total: configTotal,
        });
      });

      it('does not include hidden types in a cardinality aggregation', async () => {
        const { body } = await findWithHiddenTypes({
          type_count: { cardinality: { field: 'type' } },
        });

        expect(body).to.eql({
          aggregations: {
            type_count: { value: 1 },
          },
          page: 1,
          per_page: 0,
          saved_objects: [],
          total: configTotal,
        });
      });
    });
  });
}
