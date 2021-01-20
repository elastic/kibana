/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog, createAnyInstanceSerializer } from '@kbn/dev-utils';

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
        "buildDefaultDist": true,
        "buildOssDist": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerPackage": false,
        "createDockerUbiPackage": false,
        "createRpmPackage": false,
        "downloadFreshNode": true,
        "isRelease": false,
        "targetAllPlatforms": false,
        "versionQualifier": "",
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
        "buildDefaultDist": true,
        "buildOssDist": true,
        "createArchives": true,
        "createDebPackage": true,
        "createDockerPackage": true,
        "createDockerUbiPackage": true,
        "createRpmPackage": true,
        "downloadFreshNode": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
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
        "buildDefaultDist": true,
        "buildOssDist": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerPackage": false,
        "createDockerUbiPackage": false,
        "createRpmPackage": true,
        "downloadFreshNode": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
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
        "buildDefaultDist": true,
        "buildOssDist": true,
        "createArchives": true,
        "createDebPackage": true,
        "createDockerPackage": false,
        "createDockerUbiPackage": false,
        "createRpmPackage": false,
        "downloadFreshNode": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --docker passed with --all-platforms', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms', '--docker']))
    .toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildDefaultDist": true,
        "buildOssDist": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerPackage": true,
        "createDockerUbiPackage": true,
        "createRpmPackage": false,
        "downloadFreshNode": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});

it('limits packages if --docker passed with --skip-docker-ubi and --all-platforms', () => {
  expect(readCliArgs(['node', 'scripts/build', '--all-platforms', '--docker', '--skip-docker-ubi']))
    .toMatchInlineSnapshot(`
    Object {
      "buildOptions": Object {
        "buildDefaultDist": true,
        "buildOssDist": true,
        "createArchives": true,
        "createDebPackage": false,
        "createDockerPackage": true,
        "createDockerUbiPackage": false,
        "createRpmPackage": false,
        "downloadFreshNode": true,
        "isRelease": false,
        "targetAllPlatforms": true,
        "versionQualifier": "",
      },
      "log": <ToolingLog>,
      "showHelp": false,
      "unknownFlags": Array [],
    }
  `);
});
