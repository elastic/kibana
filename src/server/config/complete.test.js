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

/* eslint-disable import/no-duplicates */
import * as transformDeprecationsNS from './transform_deprecations';
import { transformDeprecations } from './transform_deprecations';
/* eslint-enable import/no-duplicates */

describe('server/config completeMixin()', function () {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  const setup = (options = {}) => {
    const {
      settings = {},
      configValues = {},
      disabledPluginSpecs = [],
    } = options;

    const server = {
      decorate: sinon.stub()
    };

    const config = {
      get: sinon.stub().returns(configValues)
    };

    const kbnServer = {
      settings,
      server,
      config,
      disabledPluginSpecs
    };

    const callCompleteMixin = () => {
      completeMixin(kbnServer, server, config);
    };

    return { config, callCompleteMixin, server };
  };

  describe('server decoration', () => {
    it('adds a config() function to the server', () => {
      const { config, callCompleteMixin, server } = setup({
        settings: {},
        configValues: {}
      });

      callCompleteMixin();
      sinon.assert.calledOnce(server.decorate);
      sinon.assert.calledWith(server.decorate, 'server', 'config', sinon.match.func);
      expect(server.decorate.firstCall.args[2]()).toBe(config);
    });
  });

  describe('all settings used', () => {
    it('should not throw', function () {
      const { callCompleteMixin } = setup({
        settings: {
          used: true
        },
        configValues: {
          used: true
        },
      });

      callCompleteMixin();
    });

    describe('more config values than settings', () => {
      it('should not throw', function () {
        const { callCompleteMixin } = setup({
          settings: {
            used: true
          },
          configValues: {
            used: true,
            foo: 'bar'
          }
        });

        callCompleteMixin();
      });
    });
  });

  describe('env setting specified', () => {
    it('should not throw', () => {
      const { callCompleteMixin } = setup({
        settings: {
          env: 'development'
        },
        configValues: {
          env: {
            name: 'development'
          }
        }
      });

      callCompleteMixin();
    });
  });

  describe('settings include non-default array settings', () => {
    it('should not throw', () => {
      const { callCompleteMixin } = setup({
        settings: {
          foo: [
            'a',
            'b'
          ]
        },
        configValues: {
          foo: []
        }
      });

      callCompleteMixin();
    });
  });

  describe('some settings unused', () => {
    it('should throw an error', function () {
      const { callCompleteMixin } = setup({
        settings: {
          unused: true
        },
        configValues: {
          used: true
        }
      });

      expect(callCompleteMixin).toThrowError('"unused" setting was not applied');
    });

    describe('error thrown', () => {
      it('has correct code, processExitCode, and message', () => {
        expect.assertions(3);

        const { callCompleteMixin } = setup({
          settings: {
            unused: true,
            foo: 'bar',
            namespace: {
              with: {
                sub: {
                  keys: true
                }
              }
            }
          }
        });

        try {
          callCompleteMixin();
        } catch (error) {
          expect(error).toHaveProperty('code', 'InvalidConfig');
          expect(error).toHaveProperty('processExitCode', 64);
          expect(error.message).toMatch('"unused", "foo", and "namespace.with.sub.keys"');
        }
      });
    });
  });

  describe('deprecation support', () => {
    it('should transform settings when determining what is unused', function () {
      sandbox.spy(transformDeprecationsNS, 'transformDeprecations');

      const settings = {
        foo: 1
      };

      const { callCompleteMixin } = setup({
        settings,
        configValues: {
          ...settings
        }
      });

      callCompleteMixin();
      sinon.assert.calledOnce(transformDeprecations);
      sinon.assert.calledWithExactly(transformDeprecations, settings);
    });

    it('should use transformed settings when considering what is used', function () {
      sandbox.stub(transformDeprecationsNS, 'transformDeprecations').callsFake((settings) => {
        settings.bar = settings.foo;
        delete settings.foo;
        return settings;
      });

      const { callCompleteMixin } = setup({
        settings: {
          foo: 1
        },
        configValues: {
          bar: 1
        }
      });

      callCompleteMixin();
      sinon.assert.calledOnce(transformDeprecations);
    });
  });

  describe('disabled plugins', () => {
    it('ignores config for plugins that are disabled', () => {
      const { callCompleteMixin } = setup({
        settings: {
          foo: {
            bar: {
              unused: true
            }
          }
        },
        disabledPluginSpecs: [
          {
            id: 'foo',
            getConfigPrefix: () => 'foo.bar'
          }
        ],
        configValues: {}
      });

      expect(callCompleteMixin).not.toThrowError();
    });
  });
});
