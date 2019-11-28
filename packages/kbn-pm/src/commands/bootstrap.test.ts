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

import { absolutePathSnapshotSerializer, stripAnsiSnapshotSerializer } from '../test_helpers';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { IPackageJson } from '../utils/package_json';
import { Project } from '../utils/project';
import { buildProjectGraph } from '../utils/projects';
import { installInDir, runScriptInPackageStreaming, yarnWorkspacesInfo } from '../utils/scripts';
import { BootstrapCommand } from './bootstrap';

const mockInstallInDir = installInDir as jest.Mock;
const mockRunScriptInPackageStreaming = runScriptInPackageStreaming as jest.Mock;
const mockLinkProjectExecutables = linkProjectExecutables as jest.Mock;
const mockYarnWorkspacesInfo = yarnWorkspacesInfo as jest.Mock;

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

const noop = () => {
  // noop
};

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
  const projectGraph = buildProjectGraph(projects);

  const logMock = jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
  });

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(logMock.mock.calls).toMatchSnapshot('logs');
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
  const projectGraph = buildProjectGraph(projects);

  const logMock = jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
  });

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(logMock.mock.calls).toMatchSnapshot('logs');
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
  const projectGraph = buildProjectGraph(projects);

  jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {
      'frozen-lockfile': true,
    },
    rootPath: '',
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
  const projectGraph = buildProjectGraph(projects);

  jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
  });

  expect(mockLinkProjectExecutables.mock.calls).toMatchSnapshot('link bins');
  expect(mockRunScriptInPackageStreaming.mock.calls).toMatchSnapshot('script');
});
