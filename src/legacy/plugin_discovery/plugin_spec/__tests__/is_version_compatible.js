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

import { isVersionCompatible } from '../is_version_compatible';

describe('plugin discovery/plugin spec', () => {
  describe('isVersionCompatible()', () => {
    const tests = [
      ['kibana', '6.0.0', true],
      ['kibana', '6.0.0-rc1', true],
      ['6.0.0-rc1', '6.0.0', true],
      ['6.0.0', '6.0.0-rc1', true],
      ['6.0.0-rc2', '6.0.0-rc1', true],
      ['6.0.0-rc2', '6.0.0-rc3', true],
      ['foo', 'bar', false],
      ['6.0.0', '5.1.4', false],
      ['5.1.4', '6.0.0', false],
      ['5.1.4-SNAPSHOT', '6.0.0-rc2-SNAPSHOT', false],
      ['5.1.4', '6.0.0-rc2-SNAPSHOT', false],
      ['5.1.4-SNAPSHOT', '6.0.0', false],
      ['5.1.4-SNAPSHOT', '6.0.0-rc2', false],
    ];

    for (const [plugin, kibana, shouldPass] of tests) {
      it(`${shouldPass ? 'should' : `shouldn't`} allow plugin: ${plugin} kibana: ${kibana}`, () => {
        expect(isVersionCompatible(plugin, kibana)).to.be(shouldPass);
      });
    }
  });
});
