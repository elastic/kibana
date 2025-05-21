/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateRuntimeField } from './update_runtime_field';
import { dataViewsService } from '../../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataViewLazy } from '../../../../common';

describe('update runtime field', () => {
  it('call usageCollection', async () => {
    const usageCollection = getUsageCollection();

    dataViewsService.getDataViewLazy.mockImplementation(
      async (id: string) =>
        ({
          removeRuntimeField: jest.fn(),
          addRuntimeField: jest.fn(),
          getRuntimeField: jest.fn().mockReturnValue({}),
          fields: {
            getByName: jest.fn().mockReturnValueOnce({
              runtimeField: {},
            }),
          },
        } as unknown as DataViewLazy)
    );

    await updateRuntimeField({
      dataViewsService,
      counterName: 'POST /path',
      usageCollection,
      id: 'dataViewId',
      name: 'fieldName',
      runtimeField: {
        type: 'keyword',
      },
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
