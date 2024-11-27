/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';
import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

describe('elasticsearch clients errors', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
    });

    esServer = await startES();
    kibanaServer = await startKibana();
  });

  afterAll(async () => {
    await kibanaServer.stop();
    await esServer.stop();
  });

  it('has the proper JSON representation', async () => {
    const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    try {
      await esClient.search({
        index: '.kibana',
        // @ts-expect-error yes this is invalid
        query: { someInvalidQuery: { foo: 'bar' } },
      });
      expect('should have thrown').toEqual('but it did not');
    } catch (e) {
      const str = JSON.stringify(e);
      expect(str).toContain(
        `{"name":"ResponseError","message":"parsing_exception\\n\\tCaused by:\\n\\t\\tnamed_object_not_found_exception: [1:30] unknown field [someInvalidQuery]\\n\\tRoot causes:\\n\\t\\tparsing_exception: unknown query [someInvalidQuery]","stack":"ResponseError: parsing_exception`
      );
      // it contains the offending line for troubleshooting.
      expect(str).toContain('src/core/server/integration_tests/elasticsearch/errors.test.ts:39:7');
    }
  });

  it('has the proper string representation', async () => {
    const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    try {
      await esClient.search({
        index: '.kibana',
        // @ts-expect-error yes this is invalid
        query: { someInvalidQuery: { foo: 'bar' } },
      });
      expect('should have thrown').toEqual('but it did not');
    } catch (e) {
      expect(String(e)).toMatchInlineSnapshot(`
        "ResponseError: parsing_exception
        	Caused by:
        		named_object_not_found_exception: [1:30] unknown field [someInvalidQuery]
        	Root causes:
        		parsing_exception: unknown query [someInvalidQuery]"
      `);
    }
  });

  it('has the proper inspect representation', async () => {
    const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    try {
      await esClient.search({
        index: '.kibana',
        // @ts-expect-error yes this is invalid
        query: { someInvalidQuery: { foo: 'bar' } },
      });
      expect('should have thrown').toEqual('but it did not');
    } catch (e) {
      const str = inspect(e);
      expect(str).toContain(`{
  name: 'ResponseError',
  message: 'parsing_exception\\n' +
    '\\tCaused by:\\n' +
    '\\t\\tnamed_object_not_found_exception: [1:30] unknown field [someInvalidQuery]\\n' +
    '\\tRoot causes:\\n' +
    '\\t\\tparsing_exception: unknown query [someInvalidQuery]',
  stack: 'ResponseError: parsing_exception\\n' +
    '\\tCaused by:\\n' +
    '\\t\\tnamed_object_not_found_exception: [1:30] unknown field [someInvalidQuery]\\n' +
    '\\tRoot causes:\\n' +
    '\\t\\tparsing_exception: unknown query [someInvalidQuery]\\n' +
    '    at KibanaTransport._request (`);
      // it contains the offending line for troubleshooting.
      expect(str).toContain('src/core/server/integration_tests/elasticsearch/errors.test.ts:80:7');
    }
  });
});
