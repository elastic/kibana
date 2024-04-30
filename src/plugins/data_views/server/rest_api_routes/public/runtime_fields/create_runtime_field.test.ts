/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRuntimeField } from './create_runtime_field';
import { dataViewsService } from '../../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataViewLazy } from '../../../../common';

describe('create runtime field', () => {
  it('call usageCollection', () => {
    const usageCollection = getUsageCollection();

    dataViewsService.getDataViewLazy.mockImplementation(
      async (id: string) =>
        ({
          addRuntimeField: jest.fn(),
          getFields: jest.fn().mockReturnValue({ getFieldMap: jest.fn().mockReturnValue({}) }),
          getRuntimeField: jest
            .fn()
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({}),
        } as unknown as DataViewLazy)
    );

    createRuntimeField({
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
