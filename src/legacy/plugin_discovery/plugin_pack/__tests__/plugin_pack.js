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

import { PluginPack } from '../plugin_pack';
import { PluginSpec } from '../../plugin_spec';

describe('plugin discovery/plugin pack', () => {
  describe('constructor', () => {
    it('requires an object', () => {
      expect(() => {
        new PluginPack();
      }).to.throwError();
    });
  });
  describe('#getPkg()', () => {
    it('returns the `pkg` constructor argument', () => {
      const pkg = {};
      const pack = new PluginPack({ pkg });
      expect(pack.getPkg()).to.be(pkg);
    });
  });
  describe('#getPath()', () => {
    it('returns the `path` constructor argument', () => {
      const path = {};
      const pack = new PluginPack({ path });
      expect(pack.getPath()).to.be(path);
    });
  });
  describe('#getPluginSpecs()', () => {
    it('calls the `provider` constructor argument with an api including a single sub class of PluginSpec', () => {
      const provider = sinon.stub();
      const pack = new PluginPack({ provider });
      sinon.assert.notCalled(provider);
      pack.getPluginSpecs();
      sinon.assert.calledOnce(provider);
      sinon.assert.calledWithExactly(provider, {
        Plugin: sinon.match(Class => {
          return Class.prototype instanceof PluginSpec;
        }, 'Subclass of PluginSpec')
      });
    });

    it('casts undefined return value to array', () => {
      const pack = new PluginPack({ provider: () => undefined });
      expect(pack.getPluginSpecs()).to.eql([]);
    });

    it('casts single PluginSpec to an array', () => {
      const pack = new PluginPack({
        path: '/dev/null',
        pkg: { name: 'foo', version: 'kibana' },
        provider: ({ Plugin }) => new Plugin({})
      });

      const specs = pack.getPluginSpecs();
      expect(specs).to.be.an('array');
      expect(specs).to.have.length(1);
      expect(specs[0]).to.be.a(PluginSpec);
    });

    it('returns an array of PluginSpec', () => {
      const pack = new PluginPack({
        path: '/dev/null',
        pkg: { name: 'foo', version: 'kibana' },
        provider: ({ Plugin }) => [
          new Plugin({}),
          new Plugin({}),
        ]
      });

      const specs = pack.getPluginSpecs();
      expect(specs).to.be.an('array');
      expect(specs).to.have.length(2);
      expect(specs[0]).to.be.a(PluginSpec);
      expect(specs[1]).to.be.a(PluginSpec);
    });

    it('throws if non-undefined return value is not an instance of api.Plugin', () => {
      let OtherPluginSpecClass;
      const otherPack = new PluginPack({
        path: '/dev/null',
        pkg: { name: 'foo', version: 'kibana' },
        provider: (api) => {
          OtherPluginSpecClass = api.Plugin;
        }
      });

      // call getPluginSpecs() on other pack to get it's api.Plugin class
      otherPack.getPluginSpecs();

      const badPacks = [
        new PluginPack({ provider: () => false }),
        new PluginPack({ provider: () => null }),
        new PluginPack({ provider: () => 1 }),
        new PluginPack({ provider: () => 'true' }),
        new PluginPack({ provider: () => true }),
        new PluginPack({ provider: () => new Date() }),
        new PluginPack({ provider: () => /foo.*bar/ }),
        new PluginPack({ provider: () => function () {} }),
        new PluginPack({ provider: () => new OtherPluginSpecClass({}) }),
      ];

      for (const pack of badPacks) {
        expect(() => pack.getPluginSpecs()).to.throwError(error => {
          expect(error.message).to.contain('unexpected plugin export');
        });
      }
    });
  });
});
