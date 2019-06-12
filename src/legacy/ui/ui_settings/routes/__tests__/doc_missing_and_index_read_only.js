/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import {
  getServices,
  chance,
  assertSinonMatch,
} from './lib';

export function docMissingAndIndexReadOnlySuite() {
  // ensure the kibana index has no documents
  beforeEach(async () => {
    const { kbnServer, callCluster } = getServices();

    // write a setting to ensure kibana index is created
    await kbnServer.inject({
      method: 'POST',
      url: '/api/kibana/settings/defaultIndex',
      payload: { value: 'abc' }
    });

    // delete all docs from kibana index to ensure savedConfig is not found
    await callCluster('deleteByQuery', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        query: { match_all: {} }
      }
    });

    // set the index to read only
    await callCluster('indices.putSettings', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        index: {
          blocks: {
            read_only: true
          }
        }
      }
    });
  });

  afterEach(async () => {
    const { kbnServer, callCluster } = getServices();

    // disable the read only block
    await callCluster('indices.putSettings', {
      index: kbnServer.config.get('kibana.index'),
      body: {
        index: {
          blocks: {
            read_only: false
          }
        }
      }
    });
  });

  describe('get route', () => {
    it('returns simulated doc with buildNum', async () => {
      const { kbnServer } = getServices();

      const { statusCode, result } = await kbnServer.inject({
        method: 'GET',
        url: '/api/kibana/settings'
      });

      expect(statusCode).to.be(200);
      assertSinonMatch(result, {
        settings: {
          buildNum: {
            userValue: sinon.match.number
          },
          foo: {
            userValue: 'bar',
            isOverridden: true
          }
        }
      });
    });
  });

  describe('set route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings/defaultIndex',
        payload: { value: defaultIndex }
      });

      expect(statusCode).to.be(403);
      assertSinonMatch(result, {
        error: 'Forbidden',
        message: sinon.match('index read-only'),
        statusCode: 403
      });
    });
  });

  describe('setMany route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbnServer } = getServices();

      const defaultIndex = chance.word();
      const { statusCode, result } = await kbnServer.inject({
        method: 'POST',
        url: '/api/kibana/settings',
        payload: {
          changes: { defaultIndex }
        }
      });

      expect(statusCode).to.be(403);
      assertSinonMatch(result, {
        error: 'Forbidden',
        message: sinon.match('index read-only'),
        statusCode: 403
      });
    });
  });

  describe('delete route', () => {
    it('fails with 403 forbidden', async () => {
      const { kbnServer } = getServices();

      const { statusCode, result } = await kbnServer.inject({
        method: 'DELETE',
        url: '/api/kibana/settings/defaultIndex'
      });

      expect(statusCode).to.be(403);
      assertSinonMatch(result, {
        error: 'Forbidden',
        message: sinon.match('index read-only'),
        statusCode: 403
      });
    });
  });
}
