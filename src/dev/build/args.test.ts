/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createAnyInstanceSerializer } from '@kbn/jest-serializers';

import { readCliArgs } from './args';

expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));

it('renders help if `--help` passed', () => {
  expect(readCliArgs(['node', 'scripts/build', '--help'])).toMatchInlineSnapshot(`
    Object {
      "log": <ToolingLog>,
      "showHelp": true,
      "unknownFlags": Array [],
    }
  `);
});

it('build default and oss dist for current platform, without packages, by default', () => {
  expect(readCliArgs(['node', 'scripts/build'])).toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerCloud": false,
        "createDockerContexts": true,
        "createDockerServerless": false,
        "createDockerUBI": false,
        "createDockerUbuntu": false,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": false,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": false,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('builds packages if --all-platforms is passed', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms'])).toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": true,
        "createDockerCloud": true,
        "createDockerContexts": true,
        "createDockerServerless": true,
        "createDockerUBI": true,
        "createDockerUbuntu": true,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": true,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --rpm passed with --all-platforms', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms', '--rpm'])).toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerCloud": false,
        "createDockerContexts": true,
        "createDockerServerless": false,
        "createDockerUBI": false,
        "createDockerUbuntu": false,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": true,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --deb passed with --all-platforms', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms', '--deb'])).toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": true,
        "createDockerCloud": false,
        "createDockerContexts": true,
        "createDockerServerless": false,
        "createDockerUBI": false,
        "createDockerUbuntu": false,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": false,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --docker passed with --all-platforms', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms', '--docker-images']))
    .toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerCloud": true,
        "createDockerContexts": true,
        "createDockerServerless": true,
        "createDockerUBI": true,
        "createDockerUbuntu": true,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": false,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --docker passed with --skip-docker-ubi and --all-platforms', () => {
  expect(
    readCliArgs([
      'node',
      'scripts/build',
      '--all-platforms',
      '--docker-images',
      '--skip-docker-ubi',
    ])
  ).toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerCloud": true,
        "createDockerContexts": true,
        "createDockerServerless": true,
        "createDockerUBI": false,
        "createDockerUbuntu": true,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": false,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --all-platforms passed with --skip-docker-ubuntu', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms', '--skip-docker-ubuntu']))
    .toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildCanvasShareableRuntime": true,
        "createArchives": true,
        "createDebPackage": true,
        "createDockerCloud": true,
        "createDockerContexts": true,
        "createDockerServerless": true,
        "createDockerUBI": true,
        "createDockerUbuntu": false,
        "createGenericFolders": true,
        "createPlatformFolders": true,
        "createRpmPackage": true,
        "dockerContextUseLocalArtifact": null,
        "dockerCrossCompile": false,
        "dockerNamespace": null,
        "dockerPush": false,
        "dockerTag": null,
        "dockerTagQualifier": null,
        "downloadCloudDependencies": true,
        "downloadFreshNode": true,
        "eprRegistry": "snapshot",
        "initialize": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
        "withExamplePlugins": false,
        "withTestPlugins": false,
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});
