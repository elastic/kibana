/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import os from 'os';

import { REPO_ROOT, kibanaPackageJson } from '@kbn/repo-info';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { Config } from './config';
import { CLOUD_PLATFORMS, DOWNLOAD_PLATFORMS } from './platform';

jest.mock('./version_info', () => ({
  getVersionInfo: () => ({
    buildSha: 'abc1234',
    buildVersion: '8.0.0',
    buildNumber: 1234,
    buildDate: '2023-05-15T23:12:09+0000',
  }),
}));

const versionInfo = jest.requireMock('./version_info').getVersionInfo();

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const setup = async ({
  targetAllPlatforms = true,
  targetServerlessPlatforms = false,
  targetCloudPlatforms = false,
  skipServerless = false,
  dockerCrossCompile = false,
  isRelease = true,
}: {
  targetAllPlatforms?: boolean;
  targetServerlessPlatforms?: boolean;
  targetCloudPlatforms?: boolean;
  skipServerless?: boolean;
  dockerCrossCompile?: boolean;
  isRelease?: boolean;
} = {}) => {
  return await Config.create({
    isRelease,
    targetAllPlatforms,
    targetServerlessPlatforms,
    targetCloudPlatforms,
    skipServerless,
    dockerContextUseLocalArtifact: false,
    dockerCrossCompile,
    dockerNamespace: null,
    dockerPush: false,
    dockerTag: '',
    dockerTagQualifier: '',
    downloadFreshNode: true,
    withExamplePlugins: false,
    withTestPlugins: true,
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
    expect(config.getNodeVersion()).toEqual(kibanaPackageJson.engines?.node);
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
        "linux-arm64",
        "linux-arm64",
        "linux-x64",
        "linux-x64",
        "linux-x64",
        "win32-arm64",
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

  it('returns both cloud platforms when Docker cross-compilation is enabled', async () => {
    const config = await setup({
      targetCloudPlatforms: true,
      dockerCrossCompile: true,
    });

    expect(config.getTargetPlatforms().map(String)).toEqual([
      'linux-x64-cloud',
      'linux-arm64-cloud',
    ]);
  });

  it.each([false, true])(
    'keeps all non-serverless platforms with --all-platforms and dockerCrossCompile = %s',
    async (dockerCrossCompile) => {
      const config = await setup({
        skipServerless: true,
        dockerCrossCompile,
      });

      const platforms = [...DOWNLOAD_PLATFORMS, ...CLOUD_PLATFORMS];
      expect(config.getTargetPlatforms()).toEqual(platforms);
      expect(config.getNodePlatforms()).toEqual(platforms);
    }
  );
});

describe('#getNodePlatforms()', () => {
  it('returns all platforms', async () => {
    const config = await setup();
    expect(
      config
        .getNodePlatforms()
        .map((p) => p.getNodeArch())
        .sort()
    ).toEqual([
      'darwin-arm64',
      'darwin-x64',
      'linux-arm64',
      'linux-arm64',
      'linux-arm64',
      'linux-x64',
      'linux-x64',
      'linux-x64',
      'win32-arm64',
      'win32-x64',
    ]);
  });

  it('returns this platform and linux, when targetAllPlatforms = false', async () => {
    const config = await setup({
      targetAllPlatforms: false,
    });
    const platforms = config.getNodePlatforms();
    expect(platforms).toBeInstanceOf(Array);
    if (!(process.platform === 'linux' && process.arch === 'x64')) {
      expect(platforms).toHaveLength(2);
      expect(platforms[0]).toBe(config.getPlatformForThisOs());
      expect(platforms[1]).toBe(config.getPlatform('linux', 'x64'));
    } else {
      expect(platforms).toHaveLength(1);
      expect(platforms[0]).toBe(config.getPlatform('linux', 'x64'));
    }
  });
});

describe.each(['cloud', 'serverless'] as const)('%s platform selection', (variant) => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['x64', 'arm64'] as const)(
    'returns only the native %s platform without Docker cross-compilation',
    async (architecture) => {
      jest.spyOn(os, 'arch').mockReturnValue(architecture);
      const config = await setup({
        targetAllPlatforms: false,
        targetCloudPlatforms: variant === 'cloud',
        targetServerlessPlatforms: variant === 'serverless',
      });

      const platforms = [`linux-${architecture}-${variant}`];
      expect(config.getTargetPlatforms().map(String)).toEqual(platforms);
      expect(config.getNodePlatforms().map(String)).toEqual(platforms);
    }
  );

  it('returns both architectures with Docker cross-compilation', async () => {
    const config = await setup({
      targetAllPlatforms: false,
      targetCloudPlatforms: variant === 'cloud',
      targetServerlessPlatforms: variant === 'serverless',
      dockerCrossCompile: true,
    });

    const platforms = [`linux-x64-${variant}`, `linux-arm64-${variant}`];
    expect(config.getTargetPlatforms().map(String)).toEqual(platforms);
    expect(config.getNodePlatforms().map(String)).toEqual(platforms);
  });

  it('preserves both architectures when all platforms are requested', async () => {
    const config = await setup({
      targetCloudPlatforms: variant === 'cloud',
      targetServerlessPlatforms: variant === 'serverless',
    });

    const platforms = [`linux-x64-${variant}`, `linux-arm64-${variant}`];
    expect(config.getTargetPlatforms().map(String)).toEqual(platforms);
    expect(config.getNodePlatforms().map(String)).toEqual(platforms);
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

describe('#getBuildDate()', () => {
  it('returns the date from the build info', async () => {
    const config = await setup();
    expect(config.getBuildDate()).toBe(versionInfo.buildDate);
  });
});

describe('#isRelease()', () => {
  it('returns true when marked as a release', async () => {
    const config = await setup({ isRelease: true });
    expect(config.isRelease).toBe(true);
  });
  it('returns false when not marked as a release', async () => {
    const config = await setup({ isRelease: false });
    expect(config.isRelease).toBe(false);
  });
});

describe('#resolveFromTarget()', () => {
  it('resolves a relative path, from the target directory', async () => {
    const config = await setup();
    expect(config.resolveFromTarget()).toBe(resolve(REPO_ROOT, 'target'));
  });
});
