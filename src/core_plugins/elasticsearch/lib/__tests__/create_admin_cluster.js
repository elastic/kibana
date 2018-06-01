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

import expect from 'expect.js';
import sinon from 'sinon';
import { set, get, partial } from 'lodash';
import { createAdminCluster } from '../create_admin_cluster';

describe('plugins/elasticsearch', function () {
  describe('create_admin_cluster', function () {
    let cluster;
    let server;

    beforeEach(() => {
      const config = {
        elasticsearch: {
          url: 'http://localhost:9200',
          logQueries: true
        }
      };

      server = sinon.spy();

      cluster = {
        close: sinon.spy()
      };

      set(server, 'plugins.elasticsearch.createCluster', sinon.mock().returns(cluster));
      set(server, 'on', sinon.spy());

      server.config = () => {
        return { get: partial(get, config) };
      };

      createAdminCluster(server);
    });

    it('creates the cluster', () => {
      const { createCluster } = server.plugins.elasticsearch;

      sinon.assert.calledOnce(createCluster);
      expect(createCluster.getCall(0).args[0]).to.eql('admin');
      expect(createCluster.getCall(0).args[1].url).to.eql('http://localhost:9200');
    });

    it('sets client logger for cluster options', () => {
      const { createCluster } = server.plugins.elasticsearch;
      const firstCall = createCluster.getCall(0);
      const Log = firstCall.args[1].log;
      const logger = new Log;

      sinon.assert.calledOnce(createCluster);
      expect(firstCall.args[0]).to.eql('admin');
      expect(firstCall.args[1].url).to.eql('http://localhost:9200');
      expect(logger.tags).to.eql(['admin']);
      expect(logger.logQueries).to.eql(true);
    });
  });
});
