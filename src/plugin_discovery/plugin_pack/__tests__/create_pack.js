import { resolve } from 'path';
import { Observable } from 'rxjs';
import expect from 'expect.js';

import { createPack$ } from '../create_pack';
import { PluginPack } from '../plugin_pack';

import {
  PLUGINS_DIR,
  assertInvalidPackError,
} from './utils';

describe('plugin discovery/create pack', () => {
  it('creates PluginPack', async () => {
    const packageJson$ = Observable.from([
      {
        packageJson: {
          directoryPath: resolve(PLUGINS_DIR, 'prebuilt'),
          contents: {
            name: 'prebuilt'
          }
        }
      }
    ]);
    const results = await createPack$(packageJson$).toArray().toPromise();
    expect(results).to.have.length(1);
    expect(results[0]).to.only.have.keys(['pack']);
    const { pack } = results[0];
    expect(pack).to.be.a(PluginPack);
  });

  describe('errors thrown', () => {
    async function checkError(path, check) {
      const packageJson$ = Observable.from([{
        packageJson: {
          directoryPath: path
        }
      }]);

      const results = await createPack$(packageJson$).toArray().toPromise();
      expect(results).to.have.length(1);
      expect(results[0]).to.only.have.keys(['error']);
      const { error } = results[0];
      await check(error);
    }
    it('default export is an object', () => checkError(resolve(PLUGINS_DIR, 'exports_object'), error => {
      assertInvalidPackError(error);
      expect(error.message).to.contain('must export a function');
    }));
    it('default export is an number', () => checkError(resolve(PLUGINS_DIR, 'exports_number'), error => {
      assertInvalidPackError(error);
      expect(error.message).to.contain('must export a function');
    }));
    it('default export is an string', () => checkError(resolve(PLUGINS_DIR, 'exports_string'), error => {
      assertInvalidPackError(error);
      expect(error.message).to.contain('must export a function');
    }));
    it('directory with code that fails when required', () => checkError(resolve(PLUGINS_DIR, 'broken_code'), error => {
      expect(error.message).to.contain('Cannot find module \'does-not-exist\'');
    }));
  });
});
