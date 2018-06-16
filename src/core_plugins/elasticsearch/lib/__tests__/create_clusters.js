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
import { createClusters } from '../create_clusters';
import sinon from 'sinon';
import { partial } from 'lodash';
import Hapi from 'hapi';

import * as ClusterNS from '../cluster';

describe('plugins/elasticsearch', function () {
  describe('createClusters', function () {
    let clusters;
    let server;

    beforeEach(() => {
      server = {
        plugins: {
          elasticsearch: {}
        },
        expose: sinon.mock(),
        on: sinon.stub(),
      };

      clusters = createClusters(server);
    });

    describe('createCluster', () => {
      let cluster;
      const config = {
        url: 'http://localhost:9200',
        ssl: {
          verificationMode: 'none'
        }
      };

      beforeEach(() => {
        cluster = clusters.create('admin', config);
      });

      it('returns a cluster', () => {
        expect(cluster).to.be.a(ClusterNS.Cluster);
      });

      it('persists the cluster', () => {
        expect(clusters.get('admin')).to.be.a(ClusterNS.Cluster);
      });

      it('throws if cluster already exists', () => {
        const fn = partial(clusters.create, 'admin', config);
        expect(fn).to.throwException(/cluster \'admin\' already exists/);
      });
    });
  });

  describe('server stop', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(ClusterNS, 'Cluster').callsFake(function () {
        this.stub = true;
        this.close = sinon.stub();
      });
    });

    after(() => {
      sandbox.restore();
    });

    it('closes all clusters', async () => {
      const server = new Hapi.Server();
      server.connection({ port: 0 });
      const clusters = createClusters(server);
      const cluster = clusters.create('name', { config: true });
      expect(cluster).to.have.property('stub', true);
      sinon.assert.notCalled(cluster.close);
      await server.start();
      sinon.assert.notCalled(cluster.close);
      await server.stop();
      sinon.assert.calledOnce(cluster.close);
    });
  });
});
