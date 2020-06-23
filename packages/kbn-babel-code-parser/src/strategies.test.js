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

import { readFile } from 'fs';
import { canRequire } from './can_require';
import { parseSingleFile } from './code_parser';
import { _calculateTopLevelDependency, dependenciesParseStrategy } from './strategies';

jest.mock('./can_require', () => ({
  canRequire: jest.fn(),
}));

jest.mock('fs', () => ({
  readFile: jest.fn(),
}));

const mockCwd = '/tmp/project/dir/';

describe('Code Parser Strategies', () => {
  it('should calculate the top level dependencies correctly', () => {
    const plainDep = 'dep1/file';
    const foldedDep = '@kbn/es/file';
    const otherFoldedDep = '@kbn/es';

    expect(_calculateTopLevelDependency(plainDep)).toEqual('dep1');
    expect(_calculateTopLevelDependency(foldedDep)).toEqual('@kbn/es');
    expect(_calculateTopLevelDependency(otherFoldedDep)).toEqual('@kbn/es');
  });

  it('should exclude native modules', async () => {
    readFile.mockImplementationOnce((path, options, cb) => {
      cb(null, `require('fs')`);
    });

    const results = [];
    await dependenciesParseStrategy(mockCwd, parseSingleFile, 'dep1/file.js', {}, results);

    expect(results.length).toBe(0);
  });

  it('should return a dep from_modules', async () => {
    readFile.mockImplementationOnce((path, options, cb) => {
      cb(null, `require('dep_from_node_modules')`);
    });

    canRequire.mockImplementation((entry, cwd) => {
      if (entry === `${cwd}dep1/dep_from_node_modules`) {
        return false;
      }

      if (entry === 'dep_from_node_modules') {
        return `${mockCwd}node_modules/dep_from_node_modules/index.js`;
      }
    });

    const results = await dependenciesParseStrategy(
      mockCwd,
      parseSingleFile,
      'dep1/file.js',
      {},
      {}
    );
    expect(results[0]).toBe(`${mockCwd}node_modules/dep_from_node_modules/index.js`);
  });

  it('should return a relative dep file', async () => {
    readFile.mockImplementationOnce((path, options, cb) => {
      cb(null, `require('./relative_dep')`);
    });

    canRequire.mockImplementation((entry) => {
      if (entry === `${mockCwd}dep1/relative_dep`) {
        return `${entry}/index.js`;
      }

      return false;
    });

    const results = await dependenciesParseStrategy(
      mockCwd,
      parseSingleFile,
      'dep1/file.js',
      {},
      {}
    );
    expect(results[0]).toBe(`${mockCwd}dep1/relative_dep/index.js`);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
});
