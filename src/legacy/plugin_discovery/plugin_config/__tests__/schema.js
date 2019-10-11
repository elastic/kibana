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

import { PluginPack } from '../../plugin_pack';
import { getSchema, getStubSchema } from '../schema';

describe('plugin discovery/schema', () => {
  function createPluginSpec(configProvider) {
    return new PluginPack({
      path: '/dev/null',
      pkg: {
        name: 'test',
        version: 'kibana',
      },
      provider: ({ Plugin }) => new Plugin({
        configPrefix: 'foo.bar.baz',
        config: configProvider,
      }),
    })
      .getPluginSpecs()
      .pop();
  }

  describe('getSchema()', () => {
    it('calls the config provider and returns its return value', async () => {
      const pluginSpec = createPluginSpec(() => 'foo');
      expect(await getSchema(pluginSpec)).to.be('foo');
    });

    it('supports config provider that returns a promise', async () => {
      const pluginSpec = createPluginSpec(() => Promise.resolve('foo'));
      expect(await getSchema(pluginSpec)).to.be('foo');
    });

    it('uses default schema when no config provider', async () => {
      const schema = await getSchema(createPluginSpec());
      expect(schema).to.be.an('object');
      expect(schema).to.have.property('validate').a('function');
      expect(schema.validate({}).value).to.eql({
        enabled: true
      });
    });

    it('uses default schema when config returns falsy value', async () => {
      const schema = await getSchema(createPluginSpec(() => null));
      expect(schema).to.be.an('object');
      expect(schema).to.have.property('validate').a('function');
      expect(schema.validate({}).value).to.eql({
        enabled: true
      });
    });

    it('uses default schema when config promise resolves to falsy value', async () => {
      const schema = await getSchema(createPluginSpec(() => Promise.resolve(null)));
      expect(schema).to.be.an('object');
      expect(schema).to.have.property('validate').a('function');
      expect(schema.validate({}).value).to.eql({
        enabled: true
      });
    });
  });

  describe('getStubSchema()', () => {
    it('returns schema with enabled: false', async () => {
      const schema = await getStubSchema();
      expect(schema).to.be.an('object');
      expect(schema).to.have.property('validate').a('function');
      expect(schema.validate({}).value).to.eql({
        enabled: false
      });
    });
  });
});
