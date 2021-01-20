/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getIndexPatterns } from './utils';
import { coreMock } from '../../../../core/public/mocks';
import { mockManagementPlugin } from '../mocks';

const { savedObjects } = coreMock.createStart();
const mockManagementPluginStart = mockManagementPlugin.createStartContract();

(savedObjects.client.find as jest.Mock).mockResolvedValue({
  savedObjects: [
    {
      id: 'test',
      get: () => {
        return 'test name';
      },
    },
    {
      id: 'test1',
      get: () => {
        return 'test name 1';
      },
    },
  ],
});

test('getting index patterns', async () => {
  const indexPatterns = await getIndexPatterns(
    savedObjects.client,
    'test',
    mockManagementPluginStart
  );
  expect(indexPatterns).toMatchSnapshot();
});
