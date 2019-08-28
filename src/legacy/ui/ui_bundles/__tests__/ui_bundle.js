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

import expect from '@kbn/expect';

import { UiBundle } from '../ui_bundle';

describe('ui bundles / UiBundle', () => {
  describe('#getRequires', () => {
    it('returns modules option as a list of require calls', () => {
      const bundle = new UiBundle({
        modules: [
          'a',
          'b',
          'c'
        ]
      });

      expect(bundle.getRequires()).to.eql([
        `require('a');`,
        `require('b');`,
        `require('c');`,
      ]);
    });

    it('does not sort modules', () => {
      const bundle = new UiBundle({
        modules: [
          'c',
          'a',
          'b'
        ]
      });

      expect(bundle.getRequires()).to.eql([
        `require('c');`,
        `require('a');`,
        `require('b');`,
      ]);
    });

    it('converts \\ to /', () => {
      const bundle = new UiBundle({
        modules: [
          'a\\b\\c',
          'd/e/f',
        ]
      });

      expect(bundle.getRequires()).to.eql([
        `require('a/b/c');`,
        `require('d/e/f');`,
      ]);
    });
  });
});
