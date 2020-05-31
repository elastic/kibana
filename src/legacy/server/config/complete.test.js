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

import completeMixin from './complete';
import sinon from 'sinon';

describe('server/config completeMixin()', function () {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  const setup = (options = {}) => {
    const { settings = {}, configValues = {}, disabledPluginSpecs = [], plugins = [] } = options;

    const server = {
      decorate: sinon.stub(),
    };

    const config = {
      get: sinon.stub().returns(configValues),
    };

    const kbnServer = {
      newPlatform: {},
      settings,
      server,
      config,
      disabledPluginSpecs,
      plugins,
    };

    const callCompleteMixin = () => completeMixin(kbnServer, server, config);

    return { config, callCompleteMixin, server };
  };

  describe('server decoration', () => {
    it('adds a config() function to the server', async () => {
      const { config, callCompleteMixin, server } = setup({
        settings: {},
        configValues: {},
      });

      await callCompleteMixin();
      sinon.assert.calledOnce(server.decorate);
      sinon.assert.calledWith(server.decorate, 'server', 'config', sinon.match.func);
      expect(server.decorate.firstCall.args[2]()).toBe(config);
    });
  });
});
