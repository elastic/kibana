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

import { ToolingLog } from '@kbn/dev-utils';

import { readCliArgs } from './args';

const fn = (...subArgs: string[]) => {
  const result = readCliArgs(['node', 'scripts/build', ...subArgs]);
  (result as any).log = result.log instanceof ToolingLog ? '<ToolingLog>' : String(result.log);
  return result;
};

it('renders help if `--help` passed', () => {
  expect(fn('--help')).toMatchInlineSnapshot(`
Object {
  "log": "undefined",
  "showHelp": true,
  "unknownFlags": Array [],
}
`);
});

it('build default and oss dist for current platform, without packages, by default', () => {
  expect(fn()).toMatchInlineSnapshot(`
Object {
  "buildArgs": Object {
    "buildDefaultDist": true,
    "buildOssDist": true,
    "createArchives": true,
    "createDebPackage": false,
    "createDockerPackage": false,
    "createRpmPackage": false,
    "downloadFreshNode": true,
    "isRelease": false,
    "targetAllPlatforms": false,
    "versionQualifier": "",
  },
  "log": "<ToolingLog>",
  "showHelp": false,
  "unknownFlags": Array [],
}
`);
});

it('builds packages if --all-platforms is passed', () => {
  expect(fn('--all-platforms')).toMatchInlineSnapshot(`
Object {
  "buildArgs": Object {
    "buildDefaultDist": true,
    "buildOssDist": true,
    "createArchives": true,
    "createDebPackage": true,
    "createDockerPackage": true,
    "createRpmPackage": true,
    "downloadFreshNode": true,
    "isRelease": false,
    "targetAllPlatforms": true,
    "versionQualifier": "",
  },
  "log": "<ToolingLog>",
  "showHelp": false,
  "unknownFlags": Array [],
}
`);
});

it('limits packages if --rpm passed with --all-platforms', () => {
  expect(fn('--all-platforms', '--rpm')).toMatchInlineSnapshot(`
Object {
  "buildArgs": Object {
    "buildDefaultDist": true,
    "buildOssDist": true,
    "createArchives": true,
    "createDebPackage": false,
    "createDockerPackage": false,
    "createRpmPackage": true,
    "downloadFreshNode": true,
    "isRelease": false,
    "targetAllPlatforms": true,
    "versionQualifier": "",
  },
  "log": "<ToolingLog>",
  "showHelp": false,
  "unknownFlags": Array [],
}
`);
});

it('limits packages if --deb passed with --all-platforms', () => {
  expect(fn('--all-platforms', '--deb')).toMatchInlineSnapshot(`
Object {
  "buildArgs": Object {
    "buildDefaultDist": true,
    "buildOssDist": true,
    "createArchives": true,
    "createDebPackage": true,
    "createDockerPackage": false,
    "createRpmPackage": false,
    "downloadFreshNode": true,
    "isRelease": false,
    "targetAllPlatforms": true,
    "versionQualifier": "",
  },
  "log": "<ToolingLog>",
  "showHelp": false,
  "unknownFlags": Array [],
}
`);
});

it('limits packages if --docker passed with --all-platforms', () => {
  expect(fn('--all-platforms', '--docker')).toMatchInlineSnapshot(`
Object {
  "buildArgs": Object {
    "buildDefaultDist": true,
    "buildOssDist": true,
    "createArchives": true,
    "createDebPackage": false,
    "createDockerPackage": true,
    "createRpmPackage": false,
    "downloadFreshNode": true,
    "isRelease": false,
    "targetAllPlatforms": true,
    "versionQualifier": "",
  },
  "log": "<ToolingLog>",
  "showHelp": false,
  "unknownFlags": Array [],
}
`);
});
