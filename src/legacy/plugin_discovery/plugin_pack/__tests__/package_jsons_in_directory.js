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

import { toArray } from 'rxjs/operators';
import expect from '@kbn/expect';

import { createPackageJsonsInDirectory$ } from '../package_jsons_in_directory';

import { PLUGINS_DIR, assertInvalidDirectoryError } from './utils';

describe('plugin discovery/packs in directory', () => {
  describe('createPackageJsonsInDirectory$()', () => {
    describe('errors emitted as { error } results', () => {
      async function checkError(path, check) {
        const results = await createPackageJsonsInDirectory$(path).pipe(toArray()).toPromise();
        expect(results).to.have.length(1);
        expect(results[0]).to.only.have.keys('error');
        const { error } = results[0];
        await check(error);
      }

      it('undefined path', () =>
        checkError(undefined, (error) => {
          assertInvalidDirectoryError(error);
          expect(error.message).to.contain('path must be a string');
        }));
      it('relative path', () =>
        checkError('my/plugins', (error) => {
          assertInvalidDirectoryError(error);
          expect(error.message).to.contain('path must be absolute');
        }));
      it('./relative path', () =>
        checkError('./my/pluginsd', (error) => {
          assertInvalidDirectoryError(error);
          expect(error.message).to.contain('path must be absolute');
        }));
      it('non-existent path', () =>
        checkError(resolve(PLUGINS_DIR, 'notreal'), (error) => {
          assertInvalidDirectoryError(error);
          expect(error.message).to.contain('no such file or directory');
        }));
      it('path to a file', () =>
        checkError(resolve(PLUGINS_DIR, 'index.js'), (error) => {
          assertInvalidDirectoryError(error);
          expect(error.message).to.contain('not a directory');
        }));
    });

    it('includes child errors for invalid packageJsons within a valid directory', async () => {
      const results = await createPackageJsonsInDirectory$(PLUGINS_DIR).pipe(toArray()).toPromise();

      const errors = results.map((result) => result.error).filter(Boolean);

      const packageJsons = results.map((result) => result.packageJson).filter(Boolean);

      packageJsons.forEach((pack) => expect(pack).to.be.an(Object));
      // there should be one result for each item in PLUGINS_DIR
      expect(results).to.have.length(8);
      // three of the fixtures are errors of some sort
      expect(errors).to.have.length(2);
      // six of them are valid
      expect(packageJsons).to.have.length(6);
    });
  });
});
