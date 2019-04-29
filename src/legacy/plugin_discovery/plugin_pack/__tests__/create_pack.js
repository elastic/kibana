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
import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';
import expect from '@kbn/expect';

import { createPack$ } from '../create_pack';
import { PluginPack } from '../plugin_pack';

import {
  PLUGINS_DIR,
  assertInvalidPackError,
} from './utils';

describe('plugin discovery/create pack', () => {
  it('creates PluginPack', async () => {
    const packageJson$ = Rx.from([
      {
        packageJson: {
          directoryPath: resolve(PLUGINS_DIR, 'prebuilt'),
          contents: {
            name: 'prebuilt'
          }
        }
      }
    ]);
    const results = await createPack$(packageJson$).pipe(toArray()).toPromise();
    expect(results).to.have.length(1);
    expect(results[0]).to.only.have.keys(['pack']);
    const { pack } = results[0];
    expect(pack).to.be.a(PluginPack);
  });

  describe('errors thrown', () => {
    async function checkError(path, check) {
      const packageJson$ = Rx.from([{
        packageJson: {
          directoryPath: path
        }
      }]);

      const results = await createPack$(packageJson$).pipe(toArray()).toPromise();
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
