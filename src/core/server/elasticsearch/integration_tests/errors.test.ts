/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '../../../test_helpers/kbn_server';

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
      expect(JSON.stringify(e)).toMatchInlineSnapshot(
        `"{\\"name\\":\\"ResponseError\\",\\"message\\":\\"illegal_argument_exception: [illegal_argument_exception] Reason: request [/.kibana/_search] contains unrecognized parameter: [query]\\"}"`
      );
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
      expect(String(e)).toMatchInlineSnapshot(
        `{"error":{"root_cause":[{"type":"illegal_argument_exception","reason":"request [/.kibana/_search] contains unrecognized parameter: [query]"}],"type":"illegal_argument_exception","reason":"request [/.kibana/_search] contains unrecognized parameter: [query]"},"status":400}`
      );
    }
  });
});
