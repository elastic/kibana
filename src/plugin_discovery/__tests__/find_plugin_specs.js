import { resolve } from 'path';
import { readdirSync } from 'fs';

import expect from 'expect.js';
import { findPluginSpecs } from '../find_plugin_specs';
import { PluginSpec } from '../plugin_spec';

const CORE_PLUGINS = resolve(__dirname, '../../core_plugins');

describe('plugin discovery', () => {
  describe('findPluginSpecs()', function () {
    this.timeout(10000);

    it('finds specs for specified plugin paths', async () => {
      const { spec$ } = findPluginSpecs({
        plugins: {
          paths: [
            resolve(CORE_PLUGINS, 'console'),
            resolve(CORE_PLUGINS, 'elasticsearch'),
          ]
        }
      });

      const specs = await spec$.toArray().toPromise();
      expect(specs).to.have.length(2);
      expect(specs[0]).to.be.a(PluginSpec);
      expect(specs[0].getId()).to.be('console');
      expect(specs[1].getId()).to.be('elasticsearch');
    });

    it('finds all specs in scanDirs', async () => {
      const { spec$ } = findPluginSpecs({
        // used to ensure the dev_mode plugin is enabled
        env: 'development',

        plugins: {
          scanDirs: [CORE_PLUGINS]
        }
      });

      const expected = readdirSync(CORE_PLUGINS)
        .filter(name => !name.startsWith('.'))
        .sort((a, b) => a.localeCompare(b));

      const specs = await spec$.toArray().toPromise();
      const specIds = specs
        .map(spec => spec.getId())
        .sort((a, b) => a.localeCompare(b));

      expect(specIds).to.eql(expected);
    });

    it('does not find disabled plugins', async () => {
      const { spec$ } = findPluginSpecs({
        elasticsearch: {
          enabled: false
        },

        plugins: {
          paths: [
            resolve(CORE_PLUGINS, 'elasticsearch'),
            resolve(CORE_PLUGINS, 'kibana')
          ]
        }
      });

      const specs = await spec$.toArray().toPromise();
      expect(specs).to.have.length(1);
      expect(specs[0].getId()).to.be('kibana');
    });
  });
});
