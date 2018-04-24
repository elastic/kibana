import { resolve } from 'path';

import { createPluginAtPath$ } from './create_plugin_at_path';
import { PluginSpec } from '../plugin_spec';
import { PLUGINS_DIR, PluginsDirErrorSerializer } from './__fixtures__/utils';

expect.addSnapshotSerializer(PluginsDirErrorSerializer);

describe('plugin discovery/plugin_pack', () => {
  describe('createPluginAtPath$()', () => {
    it('returns an observable', () => {
      const ret = createPluginAtPath$();
      expect(ret).toHaveProperty('subscribe');
      expect(typeof ret.subscribe).toBe('function');
    });

    it('gets the default provider from prebuilt babel modules', async () => {
      const results = await createPluginAtPath$(resolve(PLUGINS_DIR, 'prebuilt')).toArray().toPromise();
      expect(results).toHaveLength(1);
      expect(Object.keys(results[0])).toEqual(['plugin']);
      expect(results[0].plugin).toBeInstanceOf(PluginSpec);
    });

    describe('errors emitted as { error } results', () => {
      async function checkError(path) {
        const results = await createPluginAtPath$(path).toArray().toPromise();
        expect(results).toHaveLength(1);
        expect(Object.keys(results[0])).toEqual(['error']);
        expect(results[0].error).toMatchSnapshot();
      }

      it('undefined path', () => checkError(undefined));
      it('relative path', () => checkError('plugins/foo'));
      it('./relative path', () => checkError('./plugins/foo'));
      it('non-existent path', () => checkError(resolve(PLUGINS_DIR, 'baz')));
      it('path to a file', () => checkError(resolve(PLUGINS_DIR, 'index.js')));
      it('directory without a kibana.json', () => checkError(resolve(PLUGINS_DIR, 'lib')));
      it('directory with an invalid kibana.json', () => checkError(resolve(PLUGINS_DIR, 'broken')));
      it('default export is an object', () => checkError(resolve(PLUGINS_DIR, 'exports_object')));
      it('default export is an number', () => checkError(resolve(PLUGINS_DIR, 'exports_number')));
      it('default export is an string', () => checkError(resolve(PLUGINS_DIR, 'exports_string')));
      it('directory with code that fails when required', () => checkError(resolve(PLUGINS_DIR, 'broken_code')));
    });
  });
});
