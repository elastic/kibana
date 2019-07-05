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

/* eslint-disable @typescript-eslint/no-var-requires */

jest.mock('./fs');

import { resolve } from 'path';

import { absolutePathSnapshotSerializer, stripAnsiSnapshotSerializer } from '../test_helpers';
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
  jest.restoreAllMocks();
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

    expect(getFsMockCalls()).toMatchSnapshot('fs module calls');
    expect(logMock.mock.calls).toMatchSnapshot('logs');
  });
});
