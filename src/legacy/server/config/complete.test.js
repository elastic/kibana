/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
