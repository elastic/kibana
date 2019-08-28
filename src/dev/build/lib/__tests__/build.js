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
      const sandbox = sinon.createSandbox();

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
        sandbox.resetHistory();
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
