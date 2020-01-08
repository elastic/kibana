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

import { resolve } from 'path';

import expect from '@kbn/expect';
import sinon from 'sinon';

import { PluginPack } from '../../plugin_pack';
import { PluginSpec } from '../plugin_spec';
import * as IsVersionCompatibleNS from '../is_version_compatible';

const fooPack = new PluginPack({
  path: '/dev/null',
  pkg: { name: 'foo', version: 'kibana' },
});

describe('plugin discovery/plugin spec', () => {
  describe('PluginSpec', () => {
    describe('validation', () => {
      it('throws if missing spec.id AND Pack has no name', () => {
        const pack = new PluginPack({ pkg: {} });
        expect(() => new PluginSpec(pack, {})).to.throwError(error => {
          expect(error.message).to.contain('Unable to determine plugin id');
        });
      });

      it('throws if missing spec.kibanaVersion AND Pack has no version', () => {
        const pack = new PluginPack({ pkg: { name: 'foo' } });
        expect(() => new PluginSpec(pack, {})).to.throwError(error => {
          expect(error.message).to.contain('Unable to determine plugin version');
        });
      });

      it('throws if spec.require is defined, but not an array', () => {
        function assert(require) {
          expect(() => new PluginSpec(fooPack, { require })).to.throwError(error => {
            expect(error.message).to.contain('"plugin.require" must be an array of plugin ids');
          });
        }

        assert(null);
        assert('');
        assert('kibana');
        assert(1);
        assert(0);
        assert(/a.*b/);
      });

      it('throws if spec.publicDir is truthy and not a string', () => {
        function assert(publicDir) {
          expect(() => new PluginSpec(fooPack, { publicDir })).to.throwError(error => {
            expect(error.message).to.contain(
              `The "path" argument must be of type string. Received type ${typeof publicDir}`
            );
          });
        }

        assert(1);
        assert(function() {});
        assert([]);
        assert(/a.*b/);
      });

      it('throws if spec.publicDir is not an absolute path', () => {
        function assert(publicDir) {
          expect(() => new PluginSpec(fooPack, { publicDir })).to.throwError(error => {
            expect(error.message).to.contain('plugin.publicDir must be an absolute path');
          });
        }

        assert('relative/path');
        assert('./relative/path');
      });

      it('throws if spec.publicDir basename is not `public`', () => {
        function assert(publicDir) {
          expect(() => new PluginSpec(fooPack, { publicDir })).to.throwError(error => {
            expect(error.message).to.contain('must end with a "public" directory');
          });
        }

        assert('/www');
        assert('/www/');
        assert('/www/public/my_plugin');
        assert('/www/public/my_plugin/');
      });
    });

    describe('#getPack()', () => {
      it('returns the pack', () => {
        const spec = new PluginSpec(fooPack, {});
        expect(spec.getPack()).to.be(fooPack);
      });
    });

    describe('#getPkg()', () => {
      it('returns the pkg from the pack', () => {
        const spec = new PluginSpec(fooPack, {});
        expect(spec.getPkg()).to.be(fooPack.getPkg());
      });
    });

    describe('#getPath()', () => {
      it('returns the path from the pack', () => {
        const spec = new PluginSpec(fooPack, {});
        expect(spec.getPath()).to.be(fooPack.getPath());
      });
    });

    describe('#getId()', () => {
      it('uses spec.id', () => {
        const spec = new PluginSpec(fooPack, {
          id: 'bar',
        });

        expect(spec.getId()).to.be('bar');
      });

      it('defaults to pack.pkg.name', () => {
        const spec = new PluginSpec(fooPack, {});

        expect(spec.getId()).to.be('foo');
      });
    });

    describe('#getVersion()', () => {
      it('uses spec.version', () => {
        const spec = new PluginSpec(fooPack, {
          version: 'bar',
        });

        expect(spec.getVersion()).to.be('bar');
      });

      it('defaults to pack.pkg.version', () => {
        const spec = new PluginSpec(fooPack, {});

        expect(spec.getVersion()).to.be('kibana');
      });
    });

    describe('#isEnabled()', () => {
      describe('spec.isEnabled is not defined', () => {
        function setup(configPrefix, configGetImpl) {
          const spec = new PluginSpec(fooPack, { configPrefix });
          const config = {
            get: sinon.spy(configGetImpl),
            has: sinon.stub(),
          };

          return { spec, config };
        }

        it('throws if not passed a config service', () => {
          const { spec } = setup('a.b.c', () => true);

          expect(() => spec.isEnabled()).to.throwError(error => {
            expect(error.message).to.contain('must be called with a config service');
          });
          expect(() => spec.isEnabled(null)).to.throwError(error => {
            expect(error.message).to.contain('must be called with a config service');
          });
          expect(() => spec.isEnabled({ get: () => {} })).to.throwError(error => {
            expect(error.message).to.contain('must be called with a config service');
          });
        });

        it('returns true when config.get([...configPrefix, "enabled"]) returns true', () => {
          const { spec, config } = setup('d.e.f', () => true);

          expect(spec.isEnabled(config)).to.be(true);
          sinon.assert.calledOnce(config.get);
          sinon.assert.calledWithExactly(config.get, ['d', 'e', 'f', 'enabled']);
        });

        it('returns false when config.get([...configPrefix, "enabled"]) returns false', () => {
          const { spec, config } = setup('g.h.i', () => false);

          expect(spec.isEnabled(config)).to.be(false);
          sinon.assert.calledOnce(config.get);
          sinon.assert.calledWithExactly(config.get, ['g', 'h', 'i', 'enabled']);
        });
      });

      describe('spec.isEnabled is defined', () => {
        function setup(isEnabledImpl) {
          const isEnabled = sinon.spy(isEnabledImpl);
          const spec = new PluginSpec(fooPack, { isEnabled });
          const config = {
            get: sinon.stub(),
            has: sinon.stub(),
          };

          return { isEnabled, spec, config };
        }

        it('throws if not passed a config service', () => {
          const { spec } = setup(() => true);

          expect(() => spec.isEnabled()).to.throwError(error => {
            expect(error.message).to.contain('must be called with a config service');
          });
          expect(() => spec.isEnabled(null)).to.throwError(error => {
            expect(error.message).to.contain('must be called with a config service');
          });
          expect(() => spec.isEnabled({ get: () => {} })).to.throwError(error => {
            expect(error.message).to.contain('must be called with a config service');
          });
        });

        it('does not check config if spec.isEnabled returns true', () => {
          const { spec, isEnabled, config } = setup(() => true);

          expect(spec.isEnabled(config)).to.be(true);
          sinon.assert.calledOnce(isEnabled);
          sinon.assert.notCalled(config.get);
        });

        it('does not check config if spec.isEnabled returns false', () => {
          const { spec, isEnabled, config } = setup(() => false);

          expect(spec.isEnabled(config)).to.be(false);
          sinon.assert.calledOnce(isEnabled);
          sinon.assert.notCalled(config.get);
        });
      });
    });

    describe('#getExpectedKibanaVersion()', () => {
      describe('has: spec.kibanaVersion,pkg.kibana.version,spec.version,pkg.version', () => {
        it('uses spec.kibanaVersion', () => {
          const pack = new PluginPack({
            path: '/dev/null',
            pkg: {
              name: 'expkv',
              version: '1.0.0',
              kibana: {
                version: '6.0.0',
              },
            },
          });

          const spec = new PluginSpec(pack, {
            version: '2.0.0',
            kibanaVersion: '5.0.0',
          });

          expect(spec.getExpectedKibanaVersion()).to.be('5.0.0');
        });
      });
      describe('missing: spec.kibanaVersion, has: pkg.kibana.version,spec.version,pkg.version', () => {
        it('uses pkg.kibana.version', () => {
          const pack = new PluginPack({
            path: '/dev/null',
            pkg: {
              name: 'expkv',
              version: '1.0.0',
              kibana: {
                version: '6.0.0',
              },
            },
          });

          const spec = new PluginSpec(pack, {
            version: '2.0.0',
          });

          expect(spec.getExpectedKibanaVersion()).to.be('6.0.0');
        });
      });
      describe('missing: spec.kibanaVersion,pkg.kibana.version, has: spec.version,pkg.version', () => {
        it('uses spec.version', () => {
          const pack = new PluginPack({
            path: '/dev/null',
            pkg: {
              name: 'expkv',
              version: '1.0.0',
            },
          });

          const spec = new PluginSpec(pack, {
            version: '2.0.0',
          });

          expect(spec.getExpectedKibanaVersion()).to.be('2.0.0');
        });
      });
      describe('missing: spec.kibanaVersion,pkg.kibana.version,spec.version, has: pkg.version', () => {
        it('uses pkg.version', () => {
          const pack = new PluginPack({
            path: '/dev/null',
            pkg: {
              name: 'expkv',
              version: '1.0.0',
            },
          });

          const spec = new PluginSpec(pack, {});

          expect(spec.getExpectedKibanaVersion()).to.be('1.0.0');
        });
      });
    });

    describe('#isVersionCompatible()', () => {
      it('passes this.getExpectedKibanaVersion() and arg to isVersionCompatible(), returns its result', () => {
        const spec = new PluginSpec(fooPack, { version: '1.0.0' });
        sinon.stub(spec, 'getExpectedKibanaVersion').returns('foo');
        const isVersionCompatible = sinon
          .stub(IsVersionCompatibleNS, 'isVersionCompatible')
          .returns('bar');
        expect(spec.isVersionCompatible('baz')).to.be('bar');

        sinon.assert.calledOnce(spec.getExpectedKibanaVersion);
        sinon.assert.calledWithExactly(spec.getExpectedKibanaVersion);

        sinon.assert.calledOnce(isVersionCompatible);
        sinon.assert.calledWithExactly(isVersionCompatible, 'foo', 'baz');
      });
    });

    describe('#getRequiredPluginIds()', () => {
      it('returns spec.require', () => {
        const spec = new PluginSpec(fooPack, { require: [1, 2, 3] });
        expect(spec.getRequiredPluginIds()).to.eql([1, 2, 3]);
      });
    });

    describe('#getPublicDir()', () => {
      describe('spec.publicDir === false', () => {
        it('returns null', () => {
          const spec = new PluginSpec(fooPack, { publicDir: false });
          expect(spec.getPublicDir()).to.be(null);
        });
      });

      describe('spec.publicDir is falsy', () => {
        it('returns public child of pack path', () => {
          function assert(publicDir) {
            const spec = new PluginSpec(fooPack, { publicDir });
            expect(spec.getPublicDir()).to.be(resolve('/dev/null/public'));
          }

          assert(0);
          assert('');
          assert(null);
          assert(undefined);
          assert(NaN);
        });
      });

      describe('spec.publicDir is an absolute path', () => {
        it('returns the path', () => {
          const spec = new PluginSpec(fooPack, {
            publicDir: '/var/www/public',
          });

          expect(spec.getPublicDir()).to.be('/var/www/public');
        });
      });

      // NOTE: see constructor tests for other truthy-tests that throw in constructor
    });

    describe('#getExportSpecs()', () => {
      it('returns spec.uiExports', () => {
        const spec = new PluginSpec(fooPack, {
          uiExports: 'foo',
        });

        expect(spec.getExportSpecs()).to.be('foo');
      });
    });

    describe('#getPreInitHandler()', () => {
      it('returns spec.preInit', () => {
        const spec = new PluginSpec(fooPack, {
          preInit: 'foo',
        });

        expect(spec.getPreInitHandler()).to.be('foo');
      });
    });

    describe('#getInitHandler()', () => {
      it('returns spec.init', () => {
        const spec = new PluginSpec(fooPack, {
          init: 'foo',
        });

        expect(spec.getInitHandler()).to.be('foo');
      });
    });

    describe('#getConfigPrefix()', () => {
      describe('spec.configPrefix is truthy', () => {
        it('returns spec.configPrefix', () => {
          const spec = new PluginSpec(fooPack, {
            configPrefix: 'foo.bar.baz',
          });

          expect(spec.getConfigPrefix()).to.be('foo.bar.baz');
        });
      });
      describe('spec.configPrefix is falsy', () => {
        it('returns spec.getId()', () => {
          function assert(configPrefix) {
            const spec = new PluginSpec(fooPack, { configPrefix });
            sinon.stub(spec, 'getId').returns('foo');
            expect(spec.getConfigPrefix()).to.be('foo');
            sinon.assert.calledOnce(spec.getId);
          }

          assert(false);
          assert(null);
          assert(undefined);
          assert('');
          assert(0);
        });
      });
    });

    describe('#getConfigSchemaProvider()', () => {
      it('returns spec.config', () => {
        const spec = new PluginSpec(fooPack, {
          config: 'foo',
        });

        expect(spec.getConfigSchemaProvider()).to.be('foo');
      });
    });

    describe('#readConfigValue()', () => {
      const spec = new PluginSpec(fooPack, {
        configPrefix: 'foo.bar',
      });

      const config = {
        get: sinon.stub(),
      };

      afterEach(() => config.get.resetHistory());

      describe('key = "foo"', () => {
        it('passes key as own array item', () => {
          spec.readConfigValue(config, 'foo');
          sinon.assert.calledOnce(config.get);
          sinon.assert.calledWithExactly(config.get, ['foo', 'bar', 'foo']);
        });
      });

      describe('key = "foo.bar"', () => {
        it('passes key as two array items', () => {
          spec.readConfigValue(config, 'foo.bar');
          sinon.assert.calledOnce(config.get);
          sinon.assert.calledWithExactly(config.get, ['foo', 'bar', 'foo', 'bar']);
        });
      });

      describe('key = ["foo", "bar"]', () => {
        it('merged keys into array', () => {
          spec.readConfigValue(config, ['foo', 'bar']);
          sinon.assert.calledOnce(config.get);
          sinon.assert.calledWithExactly(config.get, ['foo', 'bar', 'foo', 'bar']);
        });
      });
    });

    describe('#getDeprecationsProvider()', () => {
      it('returns spec.deprecations', () => {
        const spec = new PluginSpec(fooPack, {
          deprecations: 'foo',
        });

        expect(spec.getDeprecationsProvider()).to.be('foo');
      });
    });
  });
});
