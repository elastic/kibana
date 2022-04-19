/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

jest.mock('./fs');

import { resolve } from 'path';

import { ToolingLogCollectingWriter } from '@kbn/tooling-log';

import { absolutePathSnapshotSerializer, stripAnsiSnapshotSerializer } from '../test_helpers';
import { linkProjectExecutables } from './link_project_executables';
import { Project } from './project';
import { buildProjectGraph } from './projects';
import { log } from './log';

const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);
beforeEach(() => {
  logWriter.messages.length = 0;
});

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
(projectsByName.get('bar') as Project).isSinglePackageJsonProject = true;

const projectGraph = buildProjectGraph(projectsByName);

function getFsMockCalls() {
  const fs = require('./fs');
  const fsMockCalls: { [key: string]: any[][] } = {};
  Object.keys(fs).map((key) => {
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
  jest.restoreAllMocks();
});

describe('bin script points nowhere', () => {
  test('does not try to create symlink on node_modules/.bin for that bin script', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(false);
    fs.isDirectory.mockReturnValue(true);

    await linkProjectExecutables(projectsByName, projectGraph);
    expect(getFsMockCalls()).toMatchSnapshot('fs module calls');
  });
});

describe('bin script points to a file', () => {
  test('creates a symlink for the project bin into the roots project node_modules/.bin directory as well as node_modules/.bin directory symlink into the roots one', async () => {
    const fs = require('./fs');
    fs.isFile.mockReturnValue(true);
    fs.isDirectory.mockReturnValue(false);

    await linkProjectExecutables(projectsByName, projectGraph);

    expect(getFsMockCalls()).toMatchSnapshot('fs module calls');
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
         debg Linking package executables,
      ]
    `);
  });
});
