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

jest.mock('../utils/scripts');
jest.mock('../utils/link_project_executables');

import { resolve } from 'path';

import { ToolingLogCollectingWriter } from '@kbn/dev-utils/tooling_log';

import { absolutePathSnapshotSerializer, stripAnsiSnapshotSerializer } from '../test_helpers';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { IPackageJson } from '../utils/package_json';
import { Project } from '../utils/project';
import { buildProjectGraph } from '../utils/projects';
import { installInDir, runScriptInPackageStreaming, yarnWorkspacesInfo } from '../utils/scripts';
import { BootstrapCommand } from './bootstrap';
import { Kibana } from '../utils/kibana';
import { log } from '../utils/log';

const mockInstallInDir = installInDir as jest.Mock;
const mockRunScriptInPackageStreaming = runScriptInPackageStreaming as jest.Mock;
const mockLinkProjectExecutables = linkProjectExecutables as jest.Mock;
const mockYarnWorkspacesInfo = yarnWorkspacesInfo as jest.Mock;

const logWriter = new ToolingLogCollectingWriter('debug');
log.setLogLevel('silent');
log.setWriters([logWriter]);
beforeEach(() => {
  logWriter.messages.length = 0;
});

const createProject = (packageJson: IPackageJson, path = '.') => {
  const project = new Project(
    {
      name: 'kibana',
      version: '1.0.0',
      ...packageJson,
    },
    resolve(__dirname, path)
  );

  if (packageJson.workspaces) {
    project.isWorkspaceRoot = true;
  }

  return project;
};
expect.addSnapshotSerializer(absolutePathSnapshotSerializer);
expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

beforeEach(() => {
  mockYarnWorkspacesInfo.mockResolvedValue({});
});

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

test('handles dependencies of dependencies', async () => {
  const kibana = createProject({
    dependencies: {
      bar: '1.0.0',
    },
    workspaces: {
      packages: ['packages/*'],
    },
  });
  const foo = createProject(
    {
      dependencies: {
        bar: 'link:../bar',
      },
      name: 'foo',
    },
    'packages/foo'
  );
  const bar = createProject(
    {
      dependencies: {
        baz: 'link:../baz',
      },
      name: 'bar',
    },
    'packages/bar'
  );
  const baz = createProject(
    {
      name: 'baz',
    },
    'packages/baz'
  );

  const projects = new Map([
    ['kibana', kibana],
    ['foo', foo],
    ['bar', bar],
    ['baz', baz],
  ]);
  const kbn = new Kibana(projects);
  const projectGraph = buildProjectGraph(projects);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
    kbn,
  });

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
       info [kibana] running yarn,
      "",
      "",
       info [bar] running yarn,
      "",
      "",
       info [foo] running yarn,
      "",
      "",
    ]
  `);
});

test('does not run installer if no deps in package', async () => {
  const kibana = createProject({
    dependencies: {
      bar: '1.0.0',
    },
    workspaces: {
      packages: ['packages/*'],
    },
  });
  // bar has no dependencies
  const bar = createProject(
    {
      name: 'bar',
    },
    'packages/bar'
  );

  const projects = new Map([
    ['kibana', kibana],
    ['bar', bar],
  ]);
  const kbn = new Kibana(projects);
  const projectGraph = buildProjectGraph(projects);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
    kbn,
  });

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
       info [kibana] running yarn,
      "",
      "",
    ]
  `);
});

test('handles "frozen-lockfile"', async () => {
  const kibana = createProject({
    dependencies: {
      foo: '2.2.0',
    },
    workspaces: {
      packages: ['packages/*'],
    },
  });

  const projects = new Map([['kibana', kibana]]);
  const kbn = new Kibana(projects);
  const projectGraph = buildProjectGraph(projects);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {
      'frozen-lockfile': true,
    },
    rootPath: '',
    kbn,
  });

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
});

test('calls "kbn:bootstrap" scripts and links executables after installing deps', async () => {
  const kibana = createProject({
    dependencies: {
      bar: '1.0.0',
    },
    workspaces: {
      packages: ['packages/*'],
    },
  });
  const bar = createProject(
    {
      name: 'bar',
      scripts: {
        'kbn:bootstrap': 'node ./bar.js',
      },
    },
    'packages/bar'
  );

  const projects = new Map([
    ['kibana', kibana],
    ['bar', bar],
  ]);
  const kbn = new Kibana(projects);
  const projectGraph = buildProjectGraph(projects);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
    kbn,
  });

  expect(mockLinkProjectExecutables.mock.calls).toMatchSnapshot('link bins');
  expect(mockRunScriptInPackageStreaming.mock.calls).toMatchSnapshot('script');
});
