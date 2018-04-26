import expect from 'expect.js';
import sinon from 'sinon';

import { createBuild } from '../build';

describe('dev/build/lib/build', () => {
  describe('Build instance', () => {
    describe('#isOss()', () => {
      it('returns true if passed oss: true', () => {
        const build = createBuild({
          oss: true
        });

        expect(build.isOss()).to.be(true);
      });

      it('returns false if passed oss: false', () => {
        const build = createBuild({
          oss: false
        });

        expect(build.isOss()).to.be(false);
      });
    });

    describe('#getName()', () => {
      it('returns kibana when oss: false', () => {
        const build = createBuild({
          oss: false
        });

        expect(build.getName()).to.be('kibana');
      });
      it('returns kibana-oss when oss: true', () => {
        const build = createBuild({
          oss: true
        });

        expect(build.getName()).to.be('kibana-oss');
      });
    });

    describe('#getLogTag()', () => {
      it('returns string with build name in it', () => {
        const build = createBuild({});

        expect(build.getLogTag()).to.contain(build.getName());
      });
    });

    describe('#resolvePath()', () => {
      it('uses passed config to resolve a path relative to the build', () => {
        const resolveFromRepo = sinon.stub();
        const build = createBuild({
          config: { resolveFromRepo }
        });

        build.resolvePath('bar');
        sinon.assert.calledWithExactly(resolveFromRepo, 'build', 'kibana', 'bar');
      });

      it('passes all arguments to config.resolveFromRepo()', () => {
        const resolveFromRepo = sinon.stub();
        const build = createBuild({
          config: { resolveFromRepo }
        });

        build.resolvePath('bar', 'baz', 'box');
        sinon.assert.calledWithExactly(resolveFromRepo, 'build', 'kibana', 'bar', 'baz', 'box');
      });
    });

    describe('#resolvePathForPlatform()', () => {
      it('uses config.resolveFromRepo(), config.getBuildVersion(), and platform.getBuildName() to create path', () => {
        const resolveFromRepo = sinon.stub();
        const getBuildVersion = sinon.stub().returns('buildVersion');
        const build = createBuild({
          oss: true,
          config: { resolveFromRepo, getBuildVersion }
        });

        const getBuildName = sinon.stub().returns('platformName');
        const platform = {
          getBuildName,
        };

        build.resolvePathForPlatform(platform, 'foo', 'bar');
        sinon.assert.calledWithExactly(getBuildName);
        sinon.assert.calledWithExactly(getBuildVersion);
        sinon.assert.calledWithExactly(resolveFromRepo, 'build', 'oss', `kibana-buildVersion-platformName`, 'foo', 'bar');
      });
    });

    describe('#getPlatformArchivePath()', () => {
      const sandbox = sinon.sandbox.create();

      const config = {
        resolveFromRepo: sandbox.stub(),
        getBuildVersion: sandbox.stub().returns('buildVersion')
      };

      const build = createBuild({
        oss: false,
        config
      });

      const platform = {
        getBuildName: sandbox.stub().returns('platformName'),
        isWindows: sandbox.stub().returns(false),
      };

      beforeEach(() => {
        sandbox.reset();
      });

      it('uses config.resolveFromRepo(), config.getBuildVersion, and platform.getBuildName() to create path', () => {
        build.getPlatformArchivePath(platform);
        sinon.assert.calledWithExactly(platform.getBuildName);
        sinon.assert.calledWithExactly(platform.isWindows);
        sinon.assert.calledWithExactly(config.getBuildVersion);
        sinon.assert.calledWithExactly(config.resolveFromRepo, 'target', `kibana-buildVersion-platformName.tar.gz`);
      });

      it('creates .zip path if platform is windows', () => {
        platform.isWindows.returns(true);
        build.getPlatformArchivePath(platform);
        sinon.assert.calledWithExactly(platform.getBuildName);
        sinon.assert.calledWithExactly(platform.isWindows);
        sinon.assert.calledWithExactly(config.getBuildVersion);
        sinon.assert.calledWithExactly(config.resolveFromRepo, 'target', `kibana-buildVersion-platformName.zip`);
      });
    });
  });
});
