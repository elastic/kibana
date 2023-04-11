/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import { REPO_ROOT, kibanaPackageJson } from '@kbn/utils';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';

import { Config } from './config';

jest.mock('./version_info', () => ({
  getVersionInfo: () => ({
    buildSha: 'abc1234',
    buildVersion: '8.0.0',
    buildNumber: 1234,
  }),
}));

const versionInfo = jest.requireMock('./version_info').getVersionInfo();

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const setup = async ({ targetAllPlatforms = true }: { targetAllPlatforms?: boolean } = {}) => {
  return await Config.create({
    isRelease: true,
    targetAllPlatforms,
    dockerContextUseLocalArtifact: false,
    dockerCrossCompile: false,
  });
};

describe('#getKibanaPkg()', () => {
  it('returns the parsed package.json from the Kibana repo', async () => {
    const config = await setup();
    expect(config.getKibanaPkg()).toEqual(kibanaPackageJson);
  });
});

describe('#getNodeVersion()', () => {
  it('returns the node version from the kibana package.json', async () => {
    const config = await setup();
    expect(config.getNodeVersion()).toEqual(kibanaPackageJson.engines.node);
  });
});

describe('#getRepoRelativePath()', () => {
  it('converts an absolute path to relative path, from the root of the repo', async () => {
    const config = await setup();
    expect(config.getRepoRelativePath(__dirname)).toMatchInlineSnapshot(`"src/dev/build/lib"`);
  });
});

describe('#resolveFromRepo()', () => {
  it('resolves a relative path', async () => {
    const config = await setup();
    expect(config.resolveFromRepo('src/dev/build')).toMatchInlineSnapshot(
      `<absolute path>/src/dev/build`
    );
  });

  it('resolves a series of relative paths', async () => {
    const config = await setup();
    expect(config.resolveFromRepo('src', 'dev', 'build')).toMatchInlineSnapshot(
      `<absolute path>/src/dev/build`
    );
  });
});

describe('#getPlatform()', () => {
  it('throws error when platform does not exist', async () => {
    const config = await setup();
    expect(() => {
      config.getPlatform(
        // @ts-expect-error invalid platform name
        'foo',
        'x64'
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unable to find platform (foo) with architecture (x64)"`
    );
  });

  it('throws error when architecture does not exist', async () => {
    const config = await setup();
    expect(() => {
      config.getPlatform(
        'linux',
        // @ts-expect-error invalid platform arch
        'foo'
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unable to find platform (linux) with architecture (foo)"`
    );
  });
});

describe('#getTargetPlatforms()', () => {
  it('returns an array of all platform objects', async () => {
    const config = await setup();
    expect(
      config
        .getTargetPlatforms()
        .map((p) => p.getNodeArch())
        .sort()
    ).toMatchInlineSnapshot(`
      Array [
        "darwin-arm64",
        "darwin-x64",
        "linux-arm64",
        "linux-x64",
        "win32-x64",
      ]
    `);
  });

  it('returns just this platform when targetAllPlatforms = false', async () => {
    const config = await setup({
      targetAllPlatforms: false,
    });

    expect(config.getTargetPlatforms()).toEqual([config.getPlatformForThisOs()]);
  });
});

describe('#getNodePlatforms()', () => {
  it('returns all platforms', async () => {
    const config = await setup();
    expect(
      config
        .getTargetPlatforms()
        .map((p) => p.getNodeArch())
        .sort()
    ).toEqual(['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']);
  });

  it('returns this platform and linux, when targetAllPlatforms = false', async () => {
    const config = await setup({
      targetAllPlatforms: false,
    });
    const platforms = config.getNodePlatforms();
    expect(platforms).toBeInstanceOf(Array);
    if (process.platform !== 'linux') {
      expect(platforms).toHaveLength(2);
      expect(platforms[0]).toBe(config.getPlatformForThisOs());
      expect(platforms[1]).toBe(config.getPlatform('linux', 'x64'));
    } else {
      expect(platforms).toHaveLength(1);
      expect(platforms[0]).toBe(config.getPlatform('linux', 'x64'));
    }
  });
});

describe('#getPlatformForThisOs()', () => {
  it('returns the platform that matches the arch of this machine', async () => {
    const config = await setup();
    const currentPlatform = config.getPlatformForThisOs();
    expect(currentPlatform.getName()).toBe(process.platform);
    expect(currentPlatform.getArchitecture()).toBe(process.arch);
  });
});

describe('#getBuildVersion()', () => {
  it('returns the version from the build info', async () => {
    const config = await setup();
    expect(config.getBuildVersion()).toBe(versionInfo.buildVersion);
  });
});

describe('#getBuildNumber()', () => {
  it('returns the number from the build info', async () => {
    const config = await setup();
    expect(config.getBuildNumber()).toBe(versionInfo.buildNumber);
  });
});

describe('#getBuildSha()', () => {
  it('returns the sha from the build info', async () => {
    const config = await setup();
    expect(config.getBuildSha()).toBe(versionInfo.buildSha);
  });
});

describe('#resolveFromTarget()', () => {
  it('resolves a relative path, from the target directory', async () => {
    const config = await setup();
    expect(config.resolveFromTarget()).toBe(resolve(REPO_ROOT, 'target'));
  });
});
