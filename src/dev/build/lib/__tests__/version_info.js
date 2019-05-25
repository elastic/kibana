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

import pkg from '../../../../../package.json';
import { getVersionInfo } from '../version_info';

describe('dev/build/lib/version_info', () => {
  describe('isRelease = true', () => {
    it('returns unchanged package.version, build sha, and build number', async () => {
      const versionInfo = await getVersionInfo({
        isRelease: true,
        pkg
      });

      expect(versionInfo).to.have.property('buildVersion', pkg.version);
      expect(versionInfo).to.have.property('buildSha').match(/^[0-9a-f]{40}$/);
      expect(versionInfo).to.have.property('buildNumber').a('number').greaterThan(1000);
    });
  });
  describe('isRelease = false', () => {
    it('returns snapshot version, build sha, and build number', async () => {
      const versionInfo = await getVersionInfo({
        isRelease: false,
        pkg
      });

      expect(versionInfo).to.have.property('buildVersion').contain(pkg.version).match(/-SNAPSHOT$/);
      expect(versionInfo).to.have.property('buildSha').match(/^[0-9a-f]{40}$/);
      expect(versionInfo).to.have.property('buildNumber').a('number').greaterThan(1000);
    });
  });

  describe('versionQualifier', () => {
    it('appends a version qualifier', async () => {
      const versionInfo = await getVersionInfo({
        isRelease: true,
        versionQualifier: 'beta55',
        pkg
      });
      expect(versionInfo).to.have.property('buildVersion').be(pkg.version + '-beta55');
    });
  });
});
