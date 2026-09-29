/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { getIndexPatterns } from './utils';

const indexPatternContractMock = {
  getIdsWithTitle: vi.fn().mockReturnValue(
    Promise.resolve([
      {
        id: 'test',
        title: 'test name',
      },
      {
        id: 'test1',
        title: 'test name 1',
        name: 'Test Name 1',
      },
    ])
  ),
  get: vi.fn().mockReturnValue(Promise.resolve({})),
  getRollupsEnabled: vi.fn().mockReturnValue(true),
} as unknown as Mocked<DataViewsContract>;

test('getting index patterns', async () => {
  const indexPatterns = await getIndexPatterns('test', indexPatternContractMock);
  expect(indexPatterns).toMatchSnapshot();
});
