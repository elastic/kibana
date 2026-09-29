/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { putRuntimeField } from './put_runtime_field';
import { dataViewsService } from '../../../mocks';
import { getUsageCollection } from '../test_utils';
import type { DataViewLazy } from '../../../../common';

describe('put runtime field', () => {
  it('call usageCollection', async () => {
    const usageCollection = getUsageCollection();

    dataViewsService.getDataViewLazy.mockImplementation(
      async (id: string) =>
        ({
          removeRuntimeField: vi.fn(),
          addRuntimeField: vi.fn(),
          getFieldByName: vi.fn().mockReturnValue({
            runtimeField: {},
          }),
          getRuntimeField: vi.fn(),
        } as unknown as DataViewLazy)
    );

    await putRuntimeField({
      dataViewsService,
      counterName: 'PUT /path',
      usageCollection,
      id: 'dataViewId',
      name: 'fieldName',
      runtimeField: {
        type: 'keyword',
      },
    });
    expect(usageCollection.incrementCounter).toHaveBeenCalledTimes(1);
  });
});
