/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { putRuntimeField } from './put_runtime_field';
import { dataViewsService } from '../../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataViewLazy } from '../../../../common';

describe('put runtime field', () => {
  it('call usageCollection', () => {
    const usageCollection = getUsageCollection();

    dataViewsService.getDataViewLazy.mockImplementation(
      async (id: string) =>
        ({
          removeRuntimeField: jest.fn(),
          addRuntimeField: jest.fn(),
          getFieldByName: jest.fn().mockReturnValue({
            runtimeField: {},
          }),
          getRuntimeField: jest.fn(),
        } as unknown as DataViewLazy)
    );

    putRuntimeField({
      dataViewsService,
      counterName: 'PUT /path',
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
