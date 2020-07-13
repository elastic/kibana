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

import { resolve } from 'path';

import expect from '@kbn/expect';

import pkg from '../../../../../package.json';
import { getConfig } from '../config';
import { getVersionInfo } from '../version_info';

describe('dev/build/lib/config', () => {
  const setup = async function ({ targetAllPlatforms = true } = {}) {
    const isRelease = Boolean(Math.round(Math.random()));
    const config = await getConfig({
      isRelease,
      targetAllPlatforms,
    });
    const buildInfo = await getVersionInfo({
      isRelease,
      pkg,
    });
    return { config, buildInfo };
  };

  describe('#getKibanaPkg()', () => {
    it('returns the parsed package.json from the Kibana repo', async () => {
      const { config } = await setup();
      expect(config.getKibanaPkg()).to.eql(pkg);
    });
  });

  describe('#getNodeVersion()', () => {
    it('returns the node version from the kibana package.json', async () => {
      const { config } = await setup();
      expect(config.getNodeVersion()).to.eql(pkg.engines.node);
    });
  });

  describe('#getRepoRelativePath()', () => {
    it('converts an absolute path to relative path, from the root of the repo', async () => {
      const { config } = await setup();
      expect(config.getRepoRelativePath(__dirname)).to.match(/^src[\/\\]dev[\/\\]build/);
    });
  });

  describe('#resolveFromRepo()', () => {
    it('resolves a relative path', async () => {
      const { config } = await setup();
      expect(config.resolveFromRepo('src/dev/build/lib/__tests__')).to.be(__dirname);
    });

    it('resolves a series of relative paths', async () => {
      const { config } = await setup();
      expect(config.resolveFromRepo('src', 'dev', 'build', 'lib', '__tests__')).to.be(__dirname);
    });
  });

  describe('#getPlatform()', () => {
    it('throws error when platform does not exist', async () => {
      const { config } = await setup();
      const fn = () => config.getPlatform('foo', 'x64');

      expect(fn).to.throwException(/Unable to find platform/);
    });

    it('throws error when architecture does not exist', async () => {
      const { config } = await setup();
      const fn = () => config.getPlatform('linux', 'foo');

      expect(fn).to.throwException(/Unable to find platform/);
    });
  });

  describe('#getTargetPlatforms()', () => {
    it('returns an array of all platform objects', async () => {
      const { config } = await setup();
      expect(
        config
          .getTargetPlatforms()
          .map((p) => p.getNodeArch())
          .sort()
      ).to.eql(['darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']);
    });

    it('returns just this platform when targetAllPlatforms = false', async () => {
      const { config } = await setup({ targetAllPlatforms: false });
      const platforms = config.getTargetPlatforms();

      expect(platforms).to.be.an('array');
      expect(platforms).to.have.length(1);
      expect(platforms[0]).to.be(config.getPlatformForThisOs());
    });
  });

  describe('#getNodePlatforms()', () => {
    it('returns all platforms', async () => {
      const { config } = await setup();
      expect(
        config
          .getTargetPlatforms()
          .map((p) => p.getNodeArch())
          .sort()
      ).to.eql(['darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']);
    });

    it('returns this platform and linux, when targetAllPlatforms = false', async () => {
      const { config } = await setup({ targetAllPlatforms: false });
      const platforms = config.getNodePlatforms();
      expect(platforms).to.be.an('array');
      if (process.platform !== 'linux') {
        expect(platforms).to.have.length(2);
        expect(platforms[0]).to.be(config.getPlatformForThisOs());
        expect(platforms[1]).to.be(config.getPlatform('linux', 'x64'));
      } else {
        expect(platforms).to.have.length(1);
        expect(platforms[0]).to.be(config.getPlatform('linux', 'x64'));
      }
    });
  });

  describe('#getPlatformForThisOs()', () => {
    it('returns the platform that matches the arch of this machine', async () => {
      const { config } = await setup();
      const currentPlatform = config.getPlatformForThisOs();
      expect(currentPlatform.getName()).to.be(process.platform);
      expect(currentPlatform.getArchitecture()).to.be(process.arch);
    });
  });

  describe('#getBuildVersion()', () => {
    it('returns the version from the build info', async () => {
      const { config, buildInfo } = await setup();
      expect(config.getBuildVersion()).to.be(buildInfo.buildVersion);
    });
  });

  describe('#getBuildNumber()', () => {
    it('returns the number from the build info', async () => {
      const { config, buildInfo } = await setup();
      expect(config.getBuildNumber()).to.be(buildInfo.buildNumber);
    });
  });

  describe('#getBuildSha()', () => {
    it('returns the sha from the build info', async () => {
      const { config, buildInfo } = await setup();
      expect(config.getBuildSha()).to.be(buildInfo.buildSha);
    });
  });

  describe('#resolveFromTarget()', () => {
    it('resolves a relative path, from the target directory', async () => {
      const { config } = await setup();
      expect(config.resolveFromTarget()).to.be(resolve(__dirname, '../../../../../target'));
    });
  });
});
