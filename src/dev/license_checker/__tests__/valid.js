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

import expect from '@kbn/expect';

import { assertLicensesValid } from '../valid';

const ROOT = resolve(__dirname, '../../../../');
const NODE_MODULES = resolve(ROOT, './node_modules');

const PACKAGE = {
  name: '@elastic/httpolyglot',
  version: '0.1.2-elasticpatch1',
  licenses: ['MIT'],
  directory: resolve(NODE_MODULES, '@elastic/httpolyglot'),
  relative: 'node_modules/@elastic/httpolyglot',
};

describe('tasks/lib/licenses', () => {
  describe('assertLicensesValid()', () => {
    it('returns undefined when package has valid license', () => {
      expect(assertLicensesValid({
        packages: [PACKAGE],
        validLicenses: [...PACKAGE.licenses]
      })).to.be(undefined);
    });

    it('throw an error when the packages license is invalid', () => {
      expect(() => {
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: [`not ${PACKAGE.licenses[0]}`]
        });
      }).to.throwError(PACKAGE.name);
    });

    it('throws an error when the package has no licenses', () => {
      expect(() => {
        assertLicensesValid({
          packages: [
            {
              ...PACKAGE,
              licenses: []
            }
          ],
          validLicenses: [...PACKAGE.licenses]
        });
      }).to.throwError(PACKAGE.name);
    });

    it('includes the relative path to packages in error message', () => {
      try {
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: ['none']
        });
        throw new Error('expected assertLicensesValid() to throw');
      } catch (error) {
        expect(error.message).to.contain(PACKAGE.relative);
        expect(error.message).to.not.contain(PACKAGE.directory);
      }
    });
  });
});
