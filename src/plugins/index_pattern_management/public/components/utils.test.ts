/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPatternsContract } from 'src/plugins/data/public';
import { getIndexPatterns } from './utils';
import { mockManagementPlugin } from '../mocks';

const indexPatternContractMock = ({
  getIdsWithTitle: jest.fn().mockReturnValue(
    Promise.resolve([
      {
        id: 'test',
        title: 'test name',
      },
      {
        id: 'test1',
        title: 'test name 1',
      },
    ])
  ),
  get: jest.fn().mockReturnValue(Promise.resolve({})),
} as unknown) as jest.Mocked<IndexPatternsContract>;

const mockManagementPluginStart = mockManagementPlugin.createStartContract();

test('getting index patterns', async () => {
  const indexPatterns = await getIndexPatterns(
    'test',
    mockManagementPluginStart,
    indexPatternContractMock
  );
  expect(indexPatterns).toMatchSnapshot();
});
