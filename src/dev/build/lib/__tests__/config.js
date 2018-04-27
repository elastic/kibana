import { resolve } from 'path';

import expect from 'expect.js';

import pkg from '../../../../../package.json';
import { getConfig } from '../config';
import { getVersionInfo } from '../version_info';

describe('dev/build/lib/config', () => {
  let config;
  let buildInfo;
  before(async () => {
    const isRelease = Boolean(Math.round(Math.random()));
    config = await getConfig({
      isRelease,
    });
    buildInfo = await getVersionInfo({
      isRelease,
      pkg
    });
  });
  after(() => {
    config = null;
  });

  describe('#getKibanaPkg()', () => {
    it('returns the parsed package.json from the Kibana repo', () => {
      expect(config.getKibanaPkg()).to.eql(pkg);
    });
  });

  describe('#getNodeVersion()', () => {
    it('returns the node version from the kibana package.json', () => {
      expect(config.getNodeVersion()).to.eql(pkg.engines.node);
    });
  });

  describe('#getRepoRelativePath()', () => {
    it('converts an absolute path to relative path, from the root of the repo', () => {
      expect(config.getRepoRelativePath(__dirname)).to.match(/^src[\/\\]dev[\/\\]build/);
    });
  });

  describe('#resolveFromRepo()', () => {
    it('resolves a relative path', () => {
      expect(config.resolveFromRepo('src/dev/build/lib/__tests__'))
        .to.be(__dirname);
    });

    it('resolves a series of relative paths', () => {
      expect(config.resolveFromRepo('src', 'dev', 'build', 'lib', '__tests__'))
        .to.be(__dirname);
    });
  });

  describe('#getPlatforms()', () => {
    it('returns an array of platform objects', () => {
      const platforms = config.getPlatforms();
      expect(platforms).to.be.an('array');
      for (const platform of platforms) {
        expect(['windows', 'linux', 'darwin']).to.contain(platform.getName());
      }
    });
  });

  describe('#getLinuxPlatform()', () => {
    it('returns the linux platform', () => {
      expect(config.getLinuxPlatform().getName()).to.be('linux');
    });
  });

  describe('#getWindowsPlatform()', () => {
    it('returns the windows platform', () => {
      expect(config.getWindowsPlatform().getName()).to.be('windows');
    });
  });

  describe('#getMacPlatform()', () => {
    it('returns the mac platform', () => {
      expect(config.getMacPlatform().getName()).to.be('darwin');
    });
  });

  describe('#getPlatformForThisOs()', () => {
    it('returns the platform that matches the arch of this machine', () => {
      expect(config.getPlatformForThisOs().getName()).to.be(process.platform);
    });
  });

  describe('#getBuildVersion()', () => {
    it('returns the version from the build info', () => {
      expect(config.getBuildVersion()).to.be(buildInfo.buildVersion);
    });
  });

  describe('#getBuildNumber()', () => {
    it('returns the number from the build info', () => {
      expect(config.getBuildNumber()).to.be(buildInfo.buildNumber);
    });
  });

  describe('#getBuildSha()', () => {
    it('returns the sha from the build info', () => {
      expect(config.getBuildSha()).to.be(buildInfo.buildSha);
    });
  });

  describe('#resolveFromTarget()', () => {
    it('resolves a relative path, from the target directory', () => {
      expect(config.resolveFromTarget()).to.be(resolve(__dirname, '../../../../../target'));
    });
  });
});
