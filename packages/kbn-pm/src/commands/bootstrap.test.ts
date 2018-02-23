jest.mock('../utils/scripts');
jest.mock('../utils/link_project_executables');

import { resolve } from 'path';

import {
  absolutePathSnapshotSerializer,
  stripAnsiSnapshotSerializer,
} from '../test_helpers';
import { BootstrapCommand } from './bootstrap';
import { PackageJson } from '../utils/package_json';
import { Project } from '../utils/project';
import { buildProjectGraph } from '../utils/projects';
import { installInDir, runScriptInPackageStreaming } from '../utils/scripts';
import { linkProjectExecutables } from '../utils/link_project_executables';

const mockInstallInDir = installInDir as jest.Mock;
const mockRunScriptInPackageStreaming = runScriptInPackageStreaming as jest.Mock;
const mockLinkProjectExecutables = linkProjectExecutables as jest.Mock;

const createProject = (packageJson: PackageJson, path = '.') =>
  new Project(
    {
      name: 'kibana',
      version: '1.0.0',
      ...packageJson,
    },
    resolve(__dirname, path)
  );

expect.addSnapshotSerializer(absolutePathSnapshotSerializer);
expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

const noop = () => {};

afterEach(() => {
  jest.resetAllMocks();
});

test('handles dependencies of dependencies', async () => {
  const kibana = createProject({
    dependencies: {
      bar: 'link:packages/bar',
    },
  });
  const foo = createProject(
    {
      name: 'foo',
      dependencies: {
        bar: 'link:../bar',
      },
    },
    'packages/foo'
  );
  const bar = createProject(
    {
      name: 'bar',
      dependencies: {
        baz: 'link:../baz',
      },
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

  logMock.mockRestore();

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(logMock.mock.calls).toMatchSnapshot('logs');
});

test('does not run installer if no deps in package', async () => {
  const kibana = createProject({
    dependencies: {
      bar: 'link:packages/bar',
    },
  });
  // bar has no dependencies
  const bar = createProject(
    {
      name: 'bar',
    },
    'packages/bar'
  );

  const projects = new Map([['kibana', kibana], ['bar', bar]]);
  const projectGraph = buildProjectGraph(projects);

  const logMock = jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
  });

  logMock.mockRestore();

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(logMock.mock.calls).toMatchSnapshot('logs');
});

test('handles "frozen-lockfile"', async () => {
  const kibana = createProject({
    dependencies: {
      foo: '2.2.0',
    },
  });

  const projects = new Map([['kibana', kibana]]);
  const projectGraph = buildProjectGraph(projects);

  const logMock = jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {
      'frozen-lockfile': true,
    },
    rootPath: '',
  });

  logMock.mockRestore();

  expect(mockInstallInDir.mock.calls).toMatchSnapshot('install in dir');
});

test('calls "kbn:bootstrap" scripts and links executables after installing deps', async () => {
  const kibana = createProject({
    dependencies: {
      bar: 'link:packages/bar',
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

  const projects = new Map([['kibana', kibana], ['bar', bar]]);
  const projectGraph = buildProjectGraph(projects);

  const logMock = jest.spyOn(console, 'log').mockImplementation(noop);

  await BootstrapCommand.run(projects, projectGraph, {
    extraArgs: [],
    options: {},
    rootPath: '',
  });

  logMock.mockRestore();

  expect(mockLinkProjectExecutables.mock.calls).toMatchSnapshot('link bins');
  expect(mockRunScriptInPackageStreaming.mock.calls).toMatchSnapshot('script');
});
