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

import { isFileAccessible, read } from '../../lib';
import { getDllEntries } from './webpack_dll';

jest.mock('../../lib', () => ({
  read: jest.fn(),
  isFileAccessible: jest.fn(),
}));

const manifestContentMock = JSON.stringify({
  name: 'vendors',
  content: {
    '/mock/node_modules/dep1': {},
    '/mock/node_modules/dep2': {},
    '/mock/node_modules/dep3': {},
    '/mock/tmp/dep2': {},
  },
});

const emptyManifestContentMock = JSON.stringify({
  name: 'vendors',
  content: {},
});

const noManifestMock = JSON.stringify(null);

const noContentFieldManifestMock = JSON.stringify({
  name: 'vendors',
});

describe('Webpack DLL Build Tasks Utils', () => {
  it('should get dll entries correctly', async () => {
    read.mockImplementationOnce(async () => manifestContentMock);

    isFileAccessible.mockImplementation(() => true);

    const mockManifestPath = ['/mock/mock_dll_manifest.json'];
    const mockModulesWhitelist = ['dep1'];
    const dllEntries = await getDllEntries(mockManifestPath, mockModulesWhitelist);

    expect(dllEntries).toEqual(
      expect.arrayContaining(['/mock/node_modules/dep2', '/mock/node_modules/dep3'])
    );
  });

  it('should only include accessible files', async () => {
    read.mockImplementationOnce(async () => manifestContentMock);

    isFileAccessible.mockImplementation(() => false);

    const mockManifestPath = ['/mock/mock_dll_manifest.json'];
    const mockModulesWhitelist = ['dep1'];
    const dllEntries = await getDllEntries(mockManifestPath, mockModulesWhitelist);

    isFileAccessible.mockRestore();

    expect(dllEntries.length).toEqual(0);
  });

  it('should throw an error for no manifest file', async () => {
    read.mockImplementationOnce(async () => noManifestMock);

    const mockManifestPath = ['/mock/mock_dll_manifest.json'];

    try {
      await getDllEntries(mockManifestPath, []);
    } catch (error) {
      expect(error.message).toEqual(
        `The following dll manifest doesn't exists: /mock/mock_dll_manifest.json`
      );
    }
  });

  it('should throw an error for no manifest content field', async () => {
    read.mockImplementation(async () => noContentFieldManifestMock);

    const mockManifestPath = ['/mock/mock_dll_manifest.json'];

    try {
      await getDllEntries(mockManifestPath, []);
    } catch (error) {
      expect(error.message).toEqual(
        `The following dll manifest doesn't exists: /mock/mock_dll_manifest.json`
      );
    }
  });

  it('should throw an error for manifest file without any content', async () => {
    read.mockImplementation(async () => emptyManifestContentMock);

    const mockManifestPath = ['/mock/mock_dll_manifest.json'];

    try {
      await getDllEntries(mockManifestPath, []);
    } catch (error) {
      expect(error.message).toEqual(
        `The following dll manifest is reporting an empty dll: /mock/mock_dll_manifest.json`
      );
    }
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
});
