import expect from 'expect.js';

import { PluginPack } from '../../plugin_pack';
import { reduceExportSpecs } from '../reduce_export_specs';

const PLUGIN = new PluginPack({
  path: __dirname,
  pkg: {
    name: 'foo',
    version: 'kibana'
  },
  provider: ({ Plugin }) => (
    new Plugin({
      uiExports: {
        concatNames: {
          name: 'export1'
        },

        concat: [
          'export2',
          'export3',
        ],
      }
    })
  )
});

const REDUCERS = {
  concatNames(acc, spec, type, pluginSpec) {
    return {
      names: [].concat(
        acc.names || [],
        `${pluginSpec.getId()}:${spec.name}`,
      )
    };
  },
  concat(acc, spec, type, pluginSpec) {
    return {
      names: [].concat(
        acc.names || [],
        `${pluginSpec.getId()}:${spec}`,
      )
    };
  },
};

const PLUGIN_SPECS = PLUGIN.getPluginSpecs();

describe('reduceExportSpecs', () => {
  it('combines ui exports from a list of plugin definitions', () => {
    const exports = reduceExportSpecs(PLUGIN_SPECS, REDUCERS);
    expect(exports).to.eql({
      names: [
        'foo:export1',
        'foo:export2',
        'foo:export3',
      ]
    });
  });

  it('starts with the defaults', () => {
    const exports = reduceExportSpecs(PLUGIN_SPECS, REDUCERS, {
      names: [
        'default'
      ]
    });

    expect(exports).to.eql({
      names: [
        'default',
        'foo:export1',
        'foo:export2',
        'foo:export3',
      ]
    });
  });
});
