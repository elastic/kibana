jest.mock('../utils/scripts', () => ({
  installInDir: jest.fn(),
  runScriptInPackageStreaming: jest.fn(),
}));

import { resolve } from 'path';

import {
  absolutePathSnaphotSerializer,
  stripAnsiSnapshotSerializer,
} from '../test_helpers';
import { run } from './bootstrap';
import { Project } from '../utils/project';
import { buildProjectGraph } from '../utils/projects';
import { installInDir, runScriptInPackageStreaming } from '../utils/scripts';

const createProject = (fields, path = '.') =>
  new Project(
    {
      name: 'kibana',
      version: '1.0.0',
      ...fields,
    },
    resolve(__dirname, path)
  );

expect.addSnapshotSerializer(absolutePathSnaphotSerializer);
expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

beforeEach(() => {
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

  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

  await run(projects, projectGraph, {
    options: {},
  });

  expect(installInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(spy.mock.calls).toMatchSnapshot('logs');

  spy.mockRestore();
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

  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

  await run(projects, projectGraph, {
    options: {},
  });

  expect(installInDir.mock.calls).toMatchSnapshot('install in dir');
  expect(spy.mock.calls).toMatchSnapshot('logs');

  spy.mockRestore();
});

test('handles "frozen-lockfile"', async () => {
  const kibana = createProject({
    dependencies: {
      foo: '2.2.0',
    },
  });

  const projects = new Map([['kibana', kibana]]);
  const projectGraph = buildProjectGraph(projects);

  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

  await run(projects, projectGraph, {
    options: {
      'frozen-lockfile': true,
    },
  });

  expect(installInDir.mock.calls).toMatchSnapshot('install in dir');

  spy.mockRestore();
});

test('calls "kbn:bootstrap" script after installing deps, if it exists', async () => {
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

  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

  await run(projects, projectGraph, {
    options: {},
  });

  expect(runScriptInPackageStreaming.mock.calls).toMatchSnapshot('script');

  spy.mockRestore();
});
