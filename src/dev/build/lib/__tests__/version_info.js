import expect from 'expect.js';

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
});
