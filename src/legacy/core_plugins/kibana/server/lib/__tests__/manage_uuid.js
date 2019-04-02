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
import { startTestServers } from '../../../../../../test_utils/kbn_server';
import manageUuid from '../manage_uuid';

describe('legacy/core_plugins/kibana/server/lib', function () {
  describe('manage_uuid', function () {
    const testUuid = 'c4add484-0cba-4e05-86fe-4baa112d9e53';
    let kbnServer;
    let config;
    let servers;

    before(async function () {
      servers = await startTestServers({
        adjustTimeout: (t) => {
          this.timeout(t);
        },
      });
      kbnServer = servers.kbnServer;
    });

    // Clear uuid stuff from previous test runs
    beforeEach(function () {
      kbnServer.server.log = sinon.stub();
      config = kbnServer.server.config();
    });

    after(() => servers.stop());

    it('ensure config uuid is validated as a guid', async function () {
      config.set('server.uuid', testUuid);
      expect(config.get('server.uuid')).to.be(testUuid);

      expect(() => {
        config.set('server.uuid', 'foouid');
      }).to.throwException((e) => {
        expect(e.name).to.be('ValidationError');
      });
    });

    it('finds the previously set uuid with config match', async function () {
      const msg = `Kibana instance UUID: ${testUuid}`;
      config.set('server.uuid', testUuid);

      await manageUuid(kbnServer.server);
      await manageUuid(kbnServer.server);

      expect(kbnServer.server.log.lastCall.args[1]).to.be.eql(msg);
    });

    it('updates the previously set uuid with config value', async function () {
      config.set('server.uuid', testUuid);

      await manageUuid(kbnServer.server);

      const newUuid = '5b2de169-2785-441b-ae8c-186a1936b17d';
      const msg = `Updating Kibana instance UUID to: ${newUuid} (was: ${testUuid})`;

      config.set('server.uuid', newUuid);
      await manageUuid(kbnServer.server);

      expect(kbnServer.server.log.lastCall.args[1]).to.be(msg);
    });

    it('resumes the uuid stored in data and sets it to the config', async function () {
      const partialMsg = 'Resuming persistent Kibana instance UUID';
      config.set('server.uuid'); // set to undefined

      await manageUuid(kbnServer.server);

      expect(config.get('server.uuid')).to.be.ok(); // not undefined any more
      expect(kbnServer.server.log.lastCall.args[1]).to.match(new RegExp(`^${partialMsg}`));
    });
  });
});
