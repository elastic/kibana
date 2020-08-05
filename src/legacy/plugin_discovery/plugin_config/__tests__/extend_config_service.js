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

import sinon from 'sinon';
import expect from '@kbn/expect';

import { Config } from '../../../server/config';
import { PluginPack } from '../../plugin_pack';
import { extendConfigService, disableConfigExtension } from '../extend_config_service';
import * as SchemaNS from '../schema';
import * as SettingsNS from '../settings';

describe('plugin discovery/extend config service', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  const pluginSpec = new PluginPack({
    path: '/dev/null',
    pkg: {
      name: 'test',
      version: 'kibana',
    },
    provider: ({ Plugin }) =>
      new Plugin({
        configPrefix: 'foo.bar.baz',

        config: (Joi) =>
          Joi.object({
            enabled: Joi.boolean().default(true),
            test: Joi.string().default('bonk'),
          }).default(),

        deprecations({ rename }) {
          return [rename('oldTest', 'test')];
        },
      }),
  })
    .getPluginSpecs()
    .pop();

  describe('extendConfigService()', () => {
    it('calls getSettings, getSchema, and Config.extendSchema() correctly', async () => {
      const rootSettings = {
        foo: {
          bar: {
            enabled: false,
          },
        },
      };
      const schema = {
        validate: () => {},
      };
      const configPrefix = 'foo.bar';
      const config = {
        extendSchema: sandbox.stub(),
      };
      const pluginSpec = {
        getConfigPrefix: sandbox.stub().returns(configPrefix),
      };

      const logDeprecation = sandbox.stub();

      const getSettings = sandbox.stub(SettingsNS, 'getSettings').returns(rootSettings.foo.bar);

      const getSchema = sandbox.stub(SchemaNS, 'getSchema').returns(schema);

      await extendConfigService(pluginSpec, config, rootSettings, logDeprecation);

      sinon.assert.calledOnce(getSettings);
      sinon.assert.calledWithExactly(getSettings, pluginSpec, rootSettings, logDeprecation);

      sinon.assert.calledOnce(getSchema);
      sinon.assert.calledWithExactly(getSchema, pluginSpec);

      sinon.assert.calledOnce(config.extendSchema);
      sinon.assert.calledWithExactly(
        config.extendSchema,
        schema,
        rootSettings.foo.bar,
        configPrefix
      );
    });

    it('adds the schema for a plugin spec to its config prefix', async () => {
      const config = Config.withDefaultSchema();
      expect(config.has('foo.bar.baz')).to.be(false);
      await extendConfigService(pluginSpec, config);
      expect(config.has('foo.bar.baz')).to.be(true);
    });

    it('initializes it with the default settings', async () => {
      const config = Config.withDefaultSchema();
      await extendConfigService(pluginSpec, config);
      expect(config.get('foo.bar.baz.enabled')).to.be(true);
      expect(config.get('foo.bar.baz.test')).to.be('bonk');
    });

    it('initializes it with values from root settings if defined', async () => {
      const config = Config.withDefaultSchema();
      await extendConfigService(pluginSpec, config, {
        foo: {
          bar: {
            baz: {
              test: 'hello world',
            },
          },
        },
      });

      expect(config.get('foo.bar.baz.test')).to.be('hello world');
    });

    it('throws if root settings are invalid', async () => {
      const config = Config.withDefaultSchema();
      try {
        await extendConfigService(pluginSpec, config, {
          foo: {
            bar: {
              baz: {
                test: {
                  'not a string': true,
                },
              },
            },
          },
        });
        throw new Error('Expected extendConfigService() to throw because of bad settings');
      } catch (error) {
        expect(error.message).to.contain('"test" must be a string');
      }
    });

    it('calls logDeprecation() with deprecation messages', async () => {
      const config = Config.withDefaultSchema();
      const logDeprecation = sinon.stub();
      await extendConfigService(
        pluginSpec,
        config,
        {
          foo: {
            bar: {
              baz: {
                oldTest: '123',
              },
            },
          },
        },
        logDeprecation
      );
      sinon.assert.calledOnce(logDeprecation);
      sinon.assert.calledWithExactly(logDeprecation, sinon.match('"oldTest" is deprecated'));
    });

    it('uses settings after transforming deprecations', async () => {
      const config = Config.withDefaultSchema();
      await extendConfigService(pluginSpec, config, {
        foo: {
          bar: {
            baz: {
              oldTest: '123',
            },
          },
        },
      });
      expect(config.get('foo.bar.baz.test')).to.be('123');
    });
  });

  describe('disableConfigExtension()', () => {
    it('removes added config', async () => {
      const config = Config.withDefaultSchema();
      await extendConfigService(pluginSpec, config);
      expect(config.has('foo.bar.baz.test')).to.be(true);
      await disableConfigExtension(pluginSpec, config);
      expect(config.has('foo.bar.baz.test')).to.be(false);
    });

    it('leaves {configPrefix}.enabled config', async () => {
      const config = Config.withDefaultSchema();
      expect(config.has('foo.bar.baz.enabled')).to.be(false);
      await extendConfigService(pluginSpec, config);
      expect(config.get('foo.bar.baz.enabled')).to.be(true);
      await disableConfigExtension(pluginSpec, config);
      expect(config.get('foo.bar.baz.enabled')).to.be(false);
    });
  });
});
