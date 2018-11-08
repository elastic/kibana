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

import expect from 'expect.js';

import { versionsMatch } from '../version_match';

describe('plugins/elasticsearch', () => {
  describe('lib/version_match', () => {
    it('off', () => {
      expect(versionsMatch('abc', '1.0.0', 'off')).to.be(true);
      expect(versionsMatch('2.0.0', '1.0.0', 'off')).to.be(true);
      expect(versionsMatch('1.1.0', '1.0.0', 'off')).to.be(true);
      expect(versionsMatch('1.0.1', '1.0.0', 'off')).to.be(true);
      expect(versionsMatch('1.0.0-alpha1', '1.0.0', 'off')).to.be(true);
      expect(versionsMatch('1.0.0', '1.0.0', 'off')).to.be(true);
    });

    it('major', () => {
      expect(versionsMatch('abc', '1.0.0', 'major')).to.be(false);
      expect(versionsMatch('2.0.0', '1.0.0', 'major')).to.be(false);
      expect(versionsMatch('1.1.0', '1.0.0', 'major')).to.be(true);
      expect(versionsMatch('1.0.1', '1.0.0', 'major')).to.be(true);
      expect(versionsMatch('1.0.0-alpha1', '1.0.0', 'major')).to.be(true);
      expect(versionsMatch('1.0.0', '1.0.0', 'major')).to.be(true);
    });

    it('minor', () => {
      expect(versionsMatch('abc', '1.0.0', 'minor')).to.be(false);
      expect(versionsMatch('2.0.0', '1.0.0', 'minor')).to.be(false);
      expect(versionsMatch('1.1.0', '1.0.0', 'minor')).to.be(false);
      expect(versionsMatch('1.0.1', '1.0.0', 'minor')).to.be(true);
      expect(versionsMatch('1.0.0-alpha1', '1.0.0', 'minor')).to.be(true);
      expect(versionsMatch('1.0.0', '1.0.0', 'minor')).to.be(true);
    });
    it('patch', () => {
      expect(versionsMatch('abc', '1.0.0', 'patch')).to.be(false);
      expect(versionsMatch('2.0.0', '1.0.0', 'patch')).to.be(false);
      expect(versionsMatch('1.1.0', '1.0.0', 'patch')).to.be(false);
      expect(versionsMatch('1.0.1', '1.0.0', 'patch')).to.be(false);
      expect(versionsMatch('1.0.0-alpha1', '1.0.0', 'patch')).to.be(true);
      expect(versionsMatch('1.0.0', '1.0.0', 'patch')).to.be(true);
    });

    it('exact', () => {
      expect(versionsMatch('abc', '1.0.0', 'exact')).to.be(false);
      expect(versionsMatch('2.0.0', '1.0.0', 'exact')).to.be(false);
      expect(versionsMatch('1.1.0', '1.0.0', 'exact')).to.be(false);
      expect(versionsMatch('1.0.1', '1.0.0', 'exact')).to.be(false);
      expect(versionsMatch('1.0.0-alpha1', '1.0.0', 'exact')).to.be(false);
      expect(versionsMatch('1.0.0', '1.0.0', 'exact')).to.be(true);
    });
  });
});
