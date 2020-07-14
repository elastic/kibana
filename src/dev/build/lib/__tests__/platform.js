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

import { createPlatform } from '../platform';

describe('src/dev/build/lib/platform', () => {
  describe('getName()', () => {
    it('returns the name argument', () => {
      expect(createPlatform('foo').getName()).to.be('foo');
    });
  });

  describe('getNodeArch()', () => {
    it('returns the node arch for the passed name', () => {
      expect(createPlatform('win32', 'x64').getNodeArch()).to.be('win32-x64');
    });
  });

  describe('getBuildName()', () => {
    it('returns the build name for the passed name', () => {
      expect(createPlatform('linux', 'arm64', 'linux-aarch64').getBuildName()).to.be(
        'linux-aarch64'
      );
    });
  });

  describe('isWindows()', () => {
    it('returns true if name is win32', () => {
      expect(createPlatform('win32', 'x64').isWindows()).to.be(true);
      expect(createPlatform('linux', 'x64').isWindows()).to.be(false);
      expect(createPlatform('darwin', 'x64').isWindows()).to.be(false);
    });
  });

  describe('isLinux()', () => {
    it('returns true if name is linux', () => {
      expect(createPlatform('win32', 'x64').isLinux()).to.be(false);
      expect(createPlatform('linux', 'x64').isLinux()).to.be(true);
      expect(createPlatform('darwin', 'x64').isLinux()).to.be(false);
    });
  });

  describe('isMac()', () => {
    it('returns true if name is darwin', () => {
      expect(createPlatform('win32', 'x64').isMac()).to.be(false);
      expect(createPlatform('linux', 'x64').isMac()).to.be(false);
      expect(createPlatform('darwin', 'x64').isMac()).to.be(true);
    });
  });
});
