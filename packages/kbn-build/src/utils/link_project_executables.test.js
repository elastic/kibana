import { resolve } from 'path';

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

jest.mock('./fs');
afterEach(() => {
  jest.resetAllMocks();
});

describe('bin script points nowhere', () => {
  test('does not try to create symlink', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(false);

    await linkProjectExecutables(projectsByName, projectGraph);
    expect(fs.isFile.mock.calls).toEqual([
      [resolve(__dirname, 'bar/bin/bar.js')],
    ]);
    expect(fs.mkdirp.mock.calls).toEqual([]);
    expect(fs.createSymlink.mock.calls).toEqual([]);
  });
});

describe('bin script points to a file', () => {
  test('creates a symlink in the project node_modules/.bin directory', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(true);

    await linkProjectExecutables(projectsByName, projectGraph);
    expect(fs.isFile.mock.calls).toEqual([
      [resolve(__dirname, 'bar/bin/bar.js')],
    ]);

    expect(fs.mkdirp.mock.calls).toEqual([
      [resolve(__dirname, 'foo/node_modules/.bin/')],
    ]);

    expect(fs.createSymlink.mock.calls).toEqual([
      [
        resolve(__dirname, 'bar/bin/bar.js'),
        resolve(__dirname, 'foo/node_modules/.bin/bar'),
        'exec',
      ],
    ]);
  });
});
