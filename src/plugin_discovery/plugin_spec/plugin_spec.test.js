import { resolve } from 'path';

import { isVersionCompatible } from './is_version_compatible';
import { PluginSpec } from '../plugin_spec';

const KIBANA_JSON = {
  id: 'foo',
  version: '1.2.3',
  requiredPlugins: [
    'bar',
    'baz'
  ]
};

jest.mock('./is_version_compatible', () => {
  return {
    isVersionCompatible: jest.fn(() => true)
  };
});

beforeEach(() => {
  isVersionCompatible.mockClear();
});

describe('plugin discovery/plugin spec', () => {
  describe('PluginSpec', () => {
    describe('validation', () => {
      it('creates a spec if options include init and config', () => {
        new PluginSpec('/', KIBANA_JSON, {
          init: () => {},
          config: () => {},
        });
      });
      it('throws if options include an id', () => {
        expect(() => {
          new PluginSpec('/', KIBANA_JSON, {
            id: 'foo'
          });
        }).toThrowErrorMatchingSnapshot();
      });
      it('throws if options include requires', () => {
        expect(() => {
          new PluginSpec('/', KIBANA_JSON, {
            requires: ['bar']
          });
        }).toThrowErrorMatchingSnapshot();
      });
    });

    describe('#getPath()', () => {
      it('returns the path passed', () => {
        expect(new PluginSpec('/foo', KIBANA_JSON).getPath()).toBe('/foo');
      });
    });

    describe('#getId()', () => {
      it('returns id from kibana.json', () => {
        expect(new PluginSpec('/', KIBANA_JSON).getId()).toBe('foo');
      });
    });

    describe('#getVerison()', () => {
      it('returns version from kibana.json', () => {
        expect(new PluginSpec('/', KIBANA_JSON).getVersion()).toBe('1.2.3');
      });
    });

    describe('#isEnabled()', () => {
      describe('options.isEnabled is not defined', () => {
        function setup(configPrefix, configGetImpl) {
          const spec = new PluginSpec('/', KIBANA_JSON, {
            configPrefix,
          });

          const config = {
            get: jest.fn(configGetImpl),
            has: jest.fn()
          };

          return { spec, config };
        }

        it('throws if not passed a config service', () => {
          const { spec } = setup('a.b.c', () => true);

          expect(() => spec.isEnabled()).toThrowErrorMatchingSnapshot();
          expect(() => spec.isEnabled(null)).toThrowErrorMatchingSnapshot();
          expect(() => spec.isEnabled({ get: () => {} })).toThrowErrorMatchingSnapshot();
        });

        it('returns true when config.get([...configPrefix, "enabled"]) returns true', () => {
          const { spec, config } = setup('d.e.f', () => true);

          expect(spec.isEnabled(config)).toBe(true);
          expect(config.get.mock.calls).toMatchSnapshot();
        });

        it('returns false when config.get([...configPrefix, "enabled"]) returns false', () => {
          const { spec, config } = setup('g.h.i', () => false);

          expect(spec.isEnabled(config)).toBe(false);
          expect(config.get.mock.calls).toMatchSnapshot();
        });
      });

      describe('options.isEnabled is defined', () => {
        function setup(isEnabledImpl) {
          const isEnabled = jest.fn().mockImplementation(isEnabledImpl);
          const spec = new PluginSpec('/', KIBANA_JSON, { isEnabled });
          const config = {
            get: jest.fn(),
            has: jest.fn()
          };

          return { isEnabled, spec, config };
        }

        it('throws if not passed a config service', () => {
          const { spec } = setup(() => true);

          expect(() => spec.isEnabled()).toThrowErrorMatchingSnapshot();
          expect(() => spec.isEnabled(null)).toThrowErrorMatchingSnapshot();
          expect(() => spec.isEnabled({ get: () => {} })).toThrowErrorMatchingSnapshot();
        });

        it('does not check config if options.isEnabled returns true', () => {
          const { spec, isEnabled, config } = setup(() => true);

          expect(spec.isEnabled(config)).toBe(true);
          expect(isEnabled).toHaveBeenCalledTimes(1);
          expect(config.get).not.toHaveBeenCalled();
        });

        it('does not check config if options.isEnabled returns false', () => {
          const { spec, isEnabled, config } = setup(() => false);

          expect(spec.isEnabled(config)).toBe(false);
          expect(isEnabled).toHaveBeenCalledTimes(1);
          expect(config.get).not.toHaveBeenCalled();
        });
      });
    });

    describe('#getExpectedKibanaVersion()', () => {
      it('uses kibanaVersion from kibana.json if defined', () => {
        const spec = new PluginSpec('/', {
          ...KIBANA_JSON,
          kibanaVersion: '5.0.0',
          version: '4.0.0'
        });

        expect(spec.getExpectedKibanaVersion()).toBe('5.0.0');
      });
      it('defaults to version from kibana.json', () => {
        const spec = new PluginSpec('/', {
          ...KIBANA_JSON,
          kibanaVersion: undefined,
          version: '4.0.0'
        });

        expect(spec.getExpectedKibanaVersion()).toBe('4.0.0');
      });
    });

    describe('#isVersionCompatible()', () => {
      it('passes this.getExpectedKibanaVersion() and arg to isVersionCompatible(), returns its result', () => {
        const spec = new PluginSpec('/', KIBANA_JSON);
        expect(spec.isVersionCompatible('baz')).toBe(true);
        expect(isVersionCompatible).toHaveBeenCalledTimes(1);
        expect(isVersionCompatible.mock.calls).toMatchSnapshot();
      });
    });

    describe('#getRequiredPluginIds()', () => {
      it('returns requiredPlugins from kibana.json', () => {
        const spec = new PluginSpec('/', KIBANA_JSON);
        expect(spec.getRequiredPluginIds()).toEqual([
          'bar',
          'baz'
        ]);
      });
    });

    describe('#getPublicDir()', () => {
      describe('options.publicDir === false', () => {
        it('returns null', () => {
          const spec = new PluginSpec('/', KIBANA_JSON, {
            publicDir: false
          });
          expect(spec.getPublicDir()).toBe(null);
        });
      });

      describe('options.publicDir is undefined', () => {
        it('returns public child of pack path', () => {
          const spec = new PluginSpec('/', KIBANA_JSON, {
            publicDir: undefined
          });
          expect(spec.getPublicDir()).toBe(resolve('/public'));
        });
      });

      describe('options.publicDir is an absolute path', () => {
        it('returns the path', () => {
          const spec = new PluginSpec('/', KIBANA_JSON, {
            publicDir: '/var/www/public'
          });

          expect(spec.getPublicDir()).toBe('/var/www/public');
        });
      });
    });

    describe('#getExportSpecs()', () => {
      it('returns options.uiExports', () => {
        const spec = new PluginSpec('/', KIBANA_JSON, {
          uiExports: {
            foo: 'bar'
          }
        });

        expect(spec.getExportSpecs()).toEqual({
          foo: 'bar'
        });
      });
    });

    describe('#getPreInitHandler()', () => {
      it('returns options.preInit', () => {
        const spec = new PluginSpec('/', KIBANA_JSON, {
          preInit: () => 'foo'
        });

        expect(spec.getPreInitHandler()()).toBe('foo');
      });
    });

    describe('#getInitHandler()', () => {
      it('returns options.init', () => {
        const spec = new PluginSpec('/', KIBANA_JSON, {
          init: () => 'foo'
        });

        expect(spec.getInitHandler()()).toBe('foo');
      });
    });

    describe('#getConfigPrefix()', () => {
      describe('options.configPrefix is truthy', () => {
        it('returns options.configPrefix', () => {
          const spec = new PluginSpec('/', KIBANA_JSON, {
            configPrefix: 'foo.bar.baz'
          });

          expect(spec.getConfigPrefix()).toBe('foo.bar.baz');
        });
      });
      describe('options.configPrefix is undefined', () => {
        it('returns options.getId()', () => {
          const spec = new PluginSpec('/', KIBANA_JSON, { configPrefix: undefined });
          expect(spec.getConfigPrefix()).toBe('foo');
        });
      });
    });

    describe('#getConfigSchemaProvider()', () => {
      it('returns spec.config', () => {
        const configProvider = () => {};
        const spec = new PluginSpec('/', KIBANA_JSON, {
          config: configProvider
        });

        expect(spec.getConfigSchemaProvider()).toBe(configProvider);
      });
    });

    describe('#readConfigValue()', () => {
      const spec = new PluginSpec('/', KIBANA_JSON, {
        configPrefix: 'foo.bar'
      });

      const config = {
        get: jest.fn()
      };

      beforeEach(() => config.get.mockReset());

      describe('key = "foo"', () => {
        it('passes key as own array item', () => {
          spec.readConfigValue(config, 'foo');
          expect(config.get).toHaveBeenCalledTimes(1);
          expect(config.get).toHaveBeenCalledWith(['foo', 'bar', 'foo']);
        });
      });

      describe('key = "foo.bar"', () => {
        it('passes key as two array items', () => {
          spec.readConfigValue(config, 'foo.bar');
          expect(config.get).toHaveBeenCalledTimes(1);
          expect(config.get).toHaveBeenCalledWith(['foo', 'bar', 'foo', 'bar']);
        });
      });

      describe('key = ["foo", "bar"]', () => {
        it('merged keys into array', () => {
          spec.readConfigValue(config, ['foo', 'bar']);
          expect(config.get).toHaveBeenCalledTimes(1);
          expect(config.get).toHaveBeenCalledWith(['foo', 'bar', 'foo', 'bar']);
        });
      });
    });

    describe('#getDeprecationsProvider()', () => {
      it('returns spec.deprecations', () => {
        const provider = () => {};
        const spec = new PluginSpec('/', KIBANA_JSON, {
          deprecations: provider
        });

        expect(spec.getDeprecationsProvider()).toBe(provider);
      });
    });
  });
});
