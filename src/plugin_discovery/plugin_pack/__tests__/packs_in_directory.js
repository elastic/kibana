import { resolve } from 'path';

import expect from 'expect.js';

import { createPacksInDirectory$ } from '../packs_in_directory';
import { PluginPack } from '../plugin_pack';

import {
  PLUGINS_DIR,
  assertInvalidDirectoryError,
} from './utils';

describe('plugin discovery/packs in directory', () => {
  describe('createPacksInDirectory$()', () => {
    describe('errors emitted as { error } results', () => {
      async function checkError(path, check) {
        const results = await createPacksInDirectory$(path).toArray().toPromise();
        expect(results).to.have.length(1);
        expect(results[0]).to.only.have.keys('error');
        const { error } = results[0];
        await check(error);
      }

      it('undefined path', () => checkError(undefined, error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('path must be a string');
      }));
      it('relative path', () => checkError('my/plugins', error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('path must be absolute');
      }));
      it('./relative path', () => checkError('./my/pluginsd', error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('path must be absolute');
      }));
      it('non-existent path', () => checkError(resolve(PLUGINS_DIR, 'notreal'), error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('no such file or directory');
      }));
      it('path to a file', () => checkError(resolve(PLUGINS_DIR, 'index.js'), error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('not a directory');
      }));
    });

    it('includes child errors for invalid packs within a valid directory', async () => {
      const results = await createPacksInDirectory$(PLUGINS_DIR).toArray().toPromise();

      const errors = results
        .map(result => result.error)
        .filter(Boolean);

      const packs = results
        .map(result => result.pack)
        .filter(Boolean);

      packs.forEach(pack => expect(pack).to.be.a(PluginPack));
      // there should be one result for each item in PLUGINS_DIR
      expect(results).to.have.length(9);
      // six of the fixtures are errors of some sort
      expect(errors).to.have.length(7);
      // two of them are valid
      expect(packs).to.have.length(2);
    });
  });
});
