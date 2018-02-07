import { resolve, sep as pathSep } from 'path';

import { linkProjectExecutables } from './link_project_executables';
import { Project } from './project';

const projectsByName = new Map([
  [
    'foo',
    new Project(
      {
        name: 'foo',
        dependencies: {
          bar: 'link:../bar',
        },
      },
      resolve(__dirname, 'foo')
    ),
  ],
  [
    'bar',
    new Project(
      {
        name: 'bar',
        bin: 'bin/bar.js',
      },
      resolve(__dirname, 'bar')
    ),
  ],
]);

const projectGraph = new Map([
  ['foo', [projectsByName.get('bar')]],
  ['bar', []],
]);

function assertFsMocksMatchSnapshot() {
  const fs = require('./fs');
  const repoRoot = resolve(__dirname, '../../../../');

  function rewriteAbsoluteArgs(calls) {
    return calls.map(args =>
      args.map(
        arg =>
          typeof arg === 'string' && arg.startsWith(repoRoot)
            ? arg
                .replace(repoRoot, '<repoRoot>')
                .split(pathSep)
                .join('/')
            : arg
      )
    );
  }

  const fsModuleCalls = {};
  Object.keys(fs).forEach(key => {
    if (jest.isMockFunction(fs[key])) {
      fsModuleCalls[key] = rewriteAbsoluteArgs(fs[key].mock.calls);
    }
  });

  expect(fsModuleCalls).toMatchSnapshot('fs module calls');
}

jest.mock('./fs');
afterEach(() => {
  jest.resetAllMocks();
});

describe('bin script points nowhere', () => {
  test('does not try to create symlink or node_modules/.bin directory', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(false);

    await linkProjectExecutables(projectsByName, projectGraph);
    assertFsMocksMatchSnapshot();
  });
});

describe('bin script points to a file', () => {
  test('creates a symlink in the project node_modules/.bin directory', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(true);

    await linkProjectExecutables(projectsByName, projectGraph);
    assertFsMocksMatchSnapshot();
  });
});
