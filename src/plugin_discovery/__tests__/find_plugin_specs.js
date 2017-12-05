import { resolve } from 'path';

import expect from 'expect.js';
import { findPluginSpecs } from '../find_plugin_specs';
import { PluginSpec } from '../plugin_spec';

const PLUGIN_FIXTURES = resolve(__dirname, 'fixtures/plugins');

describe('plugin discovery', () => {
  describe('findPluginSpecs()', function () {
    this.timeout(10000);

    it('finds specs for specified plugin paths', async () => {
      const { spec$ } = findPluginSpecs({
        plugins: {
          paths: [
            resolve(PLUGIN_FIXTURES, 'foo'),
            resolve(PLUGIN_FIXTURES, 'bar'),
          ]
        }
      });

      const specs = await spec$.toArray().toPromise();
      expect(specs).to.have.length(3);
      specs.forEach(spec => {
        expect(spec).to.be.a(PluginSpec);
      });
      expect(specs.map(s => s.getId()).sort())
        .to.eql(['bar:one', 'bar:two', 'foo']);
    });

    it('finds all specs in scanDirs', async () => {
      const { spec$ } = findPluginSpecs({
        // used to ensure the dev_mode plugin is enabled
        env: 'development',

        plugins: {
          scanDirs: [PLUGIN_FIXTURES]
        }
      });

      const specs = await spec$.toArray().toPromise();
      expect(specs).to.have.length(3);
      specs.forEach(spec => {
        expect(spec).to.be.a(PluginSpec);
      });
      expect(specs.map(s => s.getId()).sort())
        .to.eql(['bar:one', 'bar:two', 'foo']);
    });

    it('does not find disabled plugins', async () => {
      const { spec$ } = findPluginSpecs({
        'bar:one': {
          enabled: false
        },

        plugins: {
          paths: [
            resolve(PLUGIN_FIXTURES, 'foo'),
            resolve(PLUGIN_FIXTURES, 'bar')
          ]
        }
      });

      const specs = await spec$.toArray().toPromise();
      expect(specs).to.have.length(2);
      specs.forEach(spec => {
        expect(spec).to.be.a(PluginSpec);
      });
      expect(specs.map(s => s.getId()).sort())
        .to.eql(['bar:two', 'foo']);
    });
  });
});
