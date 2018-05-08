import { resolve } from 'path';

import { createPluginsInDirectory$ } from './create_plugins_in_directory';
import { PluginSpec } from './plugin_spec';
import { PLUGINS_DIR, PluginsDirErrorSerializer } from './__fixtures__/utils';

expect.addSnapshotSerializer(PluginsDirErrorSerializer);

describe('plugin discovery/plugins in directory', () => {
  describe('createPluginsInDirectory$()', () => {
    describe('errors emitted as { error } results', () => {
      async function checkError(path) {
        const results = await createPluginsInDirectory$(path).toArray().toPromise();
        expect(results).toHaveLength(1);
        expect(Object.keys(results[0])).toEqual(['error']);
        expect(results[0].error).toMatchSnapshot();
      }

      it('undefined path', () => checkError(undefined));
      it('relative path', () => checkError('my/plugins'));
      it('./relative path', () => checkError('./my/pluginsd'));
      it('non-existent path', () => checkError(resolve(PLUGINS_DIR, 'notreal')));
      it('path to a file', () => checkError(resolve(PLUGINS_DIR, 'index.js')));
    });

    it('includes child errors for invalid packs within a valid directory', async () => {
      const results = await createPluginsInDirectory$(PLUGINS_DIR).toArray().toPromise();

      const errors = results
        .map(result => result.error)
        .filter(Boolean);

      const plugins = results
        .map(result => result.plugin)
        .filter(Boolean);

      plugins.forEach(plugin => {
        expect(plugin).toBeInstanceOf(PluginSpec);
      });

      // there should be one result for each item in PLUGINS_DIR
      expect(results).toHaveLength(11);
      expect(errors).toHaveLength(9);
      expect(plugins).toHaveLength(2);
    });
  });
});
