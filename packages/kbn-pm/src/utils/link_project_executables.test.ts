jest.mock('./fs');

import { resolve } from 'path';

import {
  absolutePathSnapshotSerializer,
  stripAnsiSnapshotSerializer,
} from '../test_helpers';
import { linkProjectExecutables } from './link_project_executables';
import { Project } from './project';
import { buildProjectGraph } from './projects';

const projectsByName = new Map([
  [
    'foo',
    new Project(
      {
        dependencies: {
          bar: 'link:../bar',
        },
        name: 'foo',
      },
      resolve(__dirname, 'foo')
    ),
  ],
  [
    'bar',
    new Project(
      {
        bin: 'bin/bar.js',
        name: 'bar',
      },
      resolve(__dirname, 'bar')
    ),
  ],
  [
    'baz',
    new Project(
      {
        devDependencies: {
          bar: 'link:../bar',
        },
        name: 'baz',
      },
      resolve(__dirname, 'baz')
    ),
  ],
]);

const projectGraph = buildProjectGraph(projectsByName);

function getFsMockCalls() {
  const fs = require('./fs');
  const fsMockCalls: { [key: string]: any[][] } = {};
  Object.keys(fs).map(key => {
    if (jest.isMockFunction(fs[key])) {
      fsMockCalls[key] = fs[key].mock.calls;
    }
  });
  return fsMockCalls;
}

expect.addSnapshotSerializer(absolutePathSnapshotSerializer);
expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

afterEach(() => {
  jest.resetAllMocks();
});

describe('bin script points nowhere', () => {
  test('does not try to create symlink or node_modules/.bin directory', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(false);

    await linkProjectExecutables(projectsByName, projectGraph);
    expect(getFsMockCalls()).toMatchSnapshot('fs module calls');
  });
});

describe('bin script points to a file', () => {
  test('creates a symlink in the project node_modules/.bin directory', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(true);

    const logMock = jest.spyOn(console, 'log').mockImplementation(() => {
      // noop
    });
    await linkProjectExecutables(projectsByName, projectGraph);
    logMock.mockRestore();

    expect(getFsMockCalls()).toMatchSnapshot('fs module calls');
    expect(logMock.mock.calls).toMatchSnapshot('logs');
  });
});
