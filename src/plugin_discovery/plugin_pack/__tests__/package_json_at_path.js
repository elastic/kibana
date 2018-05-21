import { resolve } from 'path';
import { toArray } from 'rxjs/operators';

import expect from 'expect.js';

import { createPackageJsonAtPath$ } from '../package_json_at_path';
import {
  PLUGINS_DIR,
  assertInvalidPackError,
  assertInvalidDirectoryError
} from './utils';


describe('plugin discovery/plugin_pack', () => {
  describe('createPackageJsonAtPath$()', () => {
    it('returns an observable', () => {
      expect(createPackageJsonAtPath$())
        .to.have.property('subscribe').a('function');
    });
    it('gets the default provider from prebuilt babel modules', async () => {
      const results = await createPackageJsonAtPath$(resolve(PLUGINS_DIR, 'prebuilt')).pipe(toArray()).toPromise();
      expect(results).to.have.length(1);
      expect(results[0]).to.only.have.keys(['packageJson']);
      expect(results[0].packageJson).to.be.an(Object);
      expect(results[0].packageJson.directoryPath).to.be(resolve(PLUGINS_DIR, 'prebuilt'));
      expect(results[0].packageJson.contents).to.eql({ name: 'prebuilt' });
    });
    describe('errors emitted as { error } results', () => {
      async function checkError(path, check) {
        const results = await createPackageJsonAtPath$(path).pipe(toArray()).toPromise();
        expect(results).to.have.length(1);
        expect(results[0]).to.only.have.keys(['error']);
        const { error } = results[0];
        await check(error);
      }
      it('undefined path', () => checkError(undefined, error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('path must be a string');
      }));
      it('relative path', () => checkError('plugins/foo', error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('path must be absolute');
      }));
      it('./relative path', () => checkError('./plugins/foo', error => {
        assertInvalidDirectoryError(error);
        expect(error.message).to.contain('path must be absolute');
      }));
      it('non-existent path', () => checkError(resolve(PLUGINS_DIR, 'baz'), error => {
        assertInvalidPackError(error);
        expect(error.message).to.contain('must be a directory');
      }));
      it('path to a file', () => checkError(resolve(PLUGINS_DIR, 'index.js'), error => {
        assertInvalidPackError(error);
        expect(error.message).to.contain('must be a directory');
      }));
      it('directory without a package.json', () => checkError(resolve(PLUGINS_DIR, 'lib'), error => {
        assertInvalidPackError(error);
        expect(error.message).to.contain('must have a package.json file');
      }));
      it('directory with an invalid package.json', () => checkError(resolve(PLUGINS_DIR, 'broken'), error => {
        assertInvalidPackError(error);
        expect(error.message).to.contain('must have a valid package.json file');
      }));
    });
  });
});
