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

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('Suggestions API', function () {
    describe('non time based', () => {
      before(async () => {
        await esArchiver.load(
          'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
        );
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/index_patterns/basic_kibana.json'
        );
      });
      after(async () => {
        await esArchiver.unload(
          'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
        );
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/index_patterns/basic_kibana.json'
        );
      });
      it('should return 200 without a query', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
            query: '',
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(1);
            expect(body).to.contain('hello');
          }));

      it('should return 200 without a query and with method set to terms_agg', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
            method: 'terms_agg',
            query: '',
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(1);
            expect(body).to.contain('hello');
          }));

      it('should return 200 without a query and with method set to terms_enum', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
            method: 'terms_enum',
            query: '',
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(1);
            expect(body).to.contain('hello');
          }));

      it('should return 200 with special characters', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
            query: '<something?with:lots&of^ bad characters',
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.be.empty();
          }));

      it('should support nested fields', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'nestedField.child',
            query: 'nes',
          })
          .expect(200, ['nestedValue']));

      it('should return 404 if index is not found', () =>
        supertest
          .post('/internal/kibana/suggestions/values/not_found')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
            query: '1',
          })
          .expect(404));

      it('should return 400 without a query', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
          })
          .expect(400));

      it('should return 400 with a bad method', () =>
        supertest
          .post('/internal/kibana/suggestions/values/basic_index')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'baz.keyword',
            query: '',
            method: 'cookie',
          })
          .expect(400));
    });

    describe('time based', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });

      after(async () => {
        await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');

        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });

      it('filter is applied on a document level with terms_agg', () =>
        supertest
          .post('/internal/kibana/suggestions/values/logstash-*')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'extension.raw',
            query: '',
            method: 'terms_agg',
            filters: [
              {
                range: {
                  '@timestamp': {
                    gte: '2015-09-19T23:43:00.000Z',
                    lte: '2015-09-20T00:25:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(1);
            expect(body).to.contain('jpg');
          }));

      it('filter returns all results because it was applied on an index level with terms_enum', () =>
        supertest
          .post('/internal/kibana/suggestions/values/logstash-*')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'extension.raw',
            query: '',
            method: 'terms_enum',
            filters: [
              {
                range: {
                  '@timestamp': {
                    gte: '2015-09-19T23:43:00.000Z',
                    lte: '2015-09-20T00:25:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          })
          .expect(200)
          .then(({ body }) => {
            // All indices have
            expect(body).to.have.length(5);
          }));

      it('filter is applied on an index level with terms_enum - find in range', () =>
        supertest
          .post('/internal/kibana/suggestions/values/logstash-*')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'request.raw',
            query: '/uploads/anatoly-art',
            method: 'terms_enum',
            filters: [
              {
                range: {
                  '@timestamp': {
                    gte: '2015-09-22T00:00:00.000Z',
                    lte: '2015-09-23T00:00:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(2);
          }));

      it('filter is applied on an index level with terms_enum - DONT find in range', () => {
        supertest
          .post('/internal/kibana/suggestions/values/logstash-*')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({
            field: 'request.raw',
            query: '/uploads/anatoly-art',
            method: 'terms_enum',
            filters: [
              {
                range: {
                  '@timestamp': {
                    gte: '2015-09-23T00:00:00.000Z',
                    lte: '2015-09-24T00:00:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          })
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(0);
          });
      });
    });
  });
}
