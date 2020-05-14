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
import { ciRunUrl } from '../transforms';

describe(`Transform fn`, () => {
  describe(`ciRunUrl`, () => {
    it(`should add the url when present in the environment`, () => {
      process.env.CI_RUN_URL = 'blah';
      expect(ciRunUrl()).to.have.property('ciRunUrl', 'blah');
    });
    it(`should not include the url if not present in the environment`, () => {
      process.env.CI_RUN_URL = void 0;
      expect(ciRunUrl({ a: 'a' })).not.to.have.property('ciRunUrl');
    });
  });
});
