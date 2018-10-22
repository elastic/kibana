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

import { resolve, sep } from 'path';

import { uniq } from 'lodash';
import expect from 'expect.js';

import { getInstalledPackages } from '../installed_packages';

const KIBANA_ROOT = resolve(__dirname, '../../../../');
const FIXTURE1_ROOT = resolve(__dirname, 'fixtures/fixture1');

describe('src/dev/npm/installed_packages', () => {
  describe('getInstalledPackages()', function () {

    let kibanaPackages;
    let fixture1Packages;
    before(async function () {
      this.timeout(30 * 1000);
      [kibanaPackages, fixture1Packages] = await Promise.all([
        getInstalledPackages({
          directory: KIBANA_ROOT
        }),
        getInstalledPackages({
          directory: FIXTURE1_ROOT
        }),
      ]);
    });

    it('requires a directory', async () => {
      try {
        await getInstalledPackages({});
        throw new Error('expected getInstalledPackages() to reject');
      } catch (err) {
        expect(err.message).to.contain('directory');
      }
    });

    it('reads all installed packages of a module', () => {
      expect(fixture1Packages).to.eql([
        {
          name: 'dep1',
          version: '0.0.2',
          licenses: [ 'Apache-2.0' ],
          repository: 'https://github.com/mycorp/dep1',
          directory: resolve(FIXTURE1_ROOT, 'node_modules/dep1'),
          relative: ['node_modules', 'dep1'].join(sep),
        },
        {
          name: 'privatedep',
          version: '0.0.2',
          repository: 'https://github.com/mycorp/privatedep',
          licenses: [ 'Apache-2.0' ],
          directory: resolve(FIXTURE1_ROOT, 'node_modules/privatedep'),
          relative: ['node_modules', 'privatedep'].join(sep)
        }
      ]);
    });

    it('returns a single entry for every package/version combo', () => {
      const tags = kibanaPackages.map(pkg => `${pkg.name}@${pkg.version}`);
      expect(tags).to.eql(uniq(tags));
    });

    it('does not include root package in the list', async () => {
      expect(kibanaPackages.find(pkg => pkg.name === 'kibana')).to.be(undefined);
      expect(fixture1Packages.find(pkg => pkg.name === 'fixture1')).to.be(undefined);
    });
  });
});
