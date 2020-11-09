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
