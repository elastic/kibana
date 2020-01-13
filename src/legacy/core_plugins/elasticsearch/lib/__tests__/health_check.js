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

import Bluebird from 'bluebird';
import sinon from 'sinon';
import expect from '@kbn/expect';

const NoConnections = require('elasticsearch').errors.NoConnections;

import healthCheck from '../health_check';
import kibanaVersion from '../kibana_version';

const esPort = 9220;

describe('plugins/elasticsearch', () => {
  describe('lib/health_check', function() {
    let health;
    let plugin;
    let cluster;
    let server;
    const sandbox = sinon.createSandbox();

    function getTimerCount() {
      return Object.keys(sandbox.clock.timers || {}).length;
    }

    beforeEach(() => {
      sandbox.useFakeTimers();
      const COMPATIBLE_VERSION_NUMBER = '5.0.0';

      // Stub the Kibana version instead of drawing from package.json.
      sandbox.stub(kibanaVersion, 'get').returns(COMPATIBLE_VERSION_NUMBER);

      // setup the plugin stub
      plugin = {
        name: 'elasticsearch',
        status: {
          red: sinon.stub(),
          green: sinon.stub(),
          yellow: sinon.stub(),
        },
      };

      cluster = { callWithInternalUser: sinon.stub(), errors: { NoConnections } };
      cluster.callWithInternalUser.withArgs('index', sinon.match.any).returns(Bluebird.resolve());
      cluster.callWithInternalUser
        .withArgs('mget', sinon.match.any)
        .returns(Bluebird.resolve({ ok: true }));
      cluster.callWithInternalUser
        .withArgs('get', sinon.match.any)
        .returns(Bluebird.resolve({ found: false }));
      cluster.callWithInternalUser
        .withArgs('search', sinon.match.any)
        .returns(Bluebird.resolve({ hits: { hits: [] } }));
      cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any).returns(
        Bluebird.resolve({
          nodes: {
            'node-01': {
              version: COMPATIBLE_VERSION_NUMBER,
              http_address: `inet[/127.0.0.1:${esPort}]`,
              ip: '127.0.0.1',
            },
          },
        })
      );

      // Setup the server mock
      server = {
        logWithMetadata: sinon.stub(),
        info: { port: 5601 },
        config: () => ({ get: sinon.stub() }),
        plugins: {
          elasticsearch: {
            getCluster: sinon.stub().returns(cluster),
          },
        },
        ext: sinon.stub(),
      };

      health = healthCheck(plugin, server, 0);
    });

    afterEach(() => sandbox.restore());

    it('should stop when cluster is shutdown', () => {
      // ensure that health.start() is responsible for the timer we are observing
      expect(getTimerCount()).to.be(0);
      health.start();
      expect(getTimerCount()).to.be(1);

      // ensure that a server extension was registered
      sinon.assert.calledOnce(server.ext);
      sinon.assert.calledWithExactly(server.ext, sinon.match.string, sinon.match.func);

      const [, handler] = server.ext.firstCall.args;
      handler(); // this should be health.stop

      // ensure that the handler unregistered the timer
      expect(getTimerCount()).to.be(0);
    });

    it('should set the cluster green if everything is ready', function() {
      cluster.callWithInternalUser.withArgs('ping').returns(Bluebird.resolve());

      return health.run().then(function() {
        sinon.assert.calledOnce(plugin.status.yellow);
        sinon.assert.calledWithExactly(plugin.status.yellow, 'Waiting for Elasticsearch');

        sinon.assert.calledOnce(
          cluster.callWithInternalUser.withArgs('nodes.info', sinon.match.any)
        );
        sinon.assert.notCalled(plugin.status.red);
        sinon.assert.calledOnce(plugin.status.green);
        sinon.assert.calledWithExactly(plugin.status.green, 'Ready');
      });
    });

    describe('#waitUntilReady', function() {
      it('waits for green status', function() {
        plugin.status.once = sinon.spy(function(event, handler) {
          expect(event).to.be('green');
          setImmediate(handler);
        });

        const waitUntilReadyPromise = health.waitUntilReady();

        sandbox.clock.runAll();

        return waitUntilReadyPromise.then(function() {
          sinon.assert.calledOnce(plugin.status.once);
        });
      });
    });
  });
});
