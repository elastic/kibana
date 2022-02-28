/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deleteRuntimeField } from './delete_runtime_field';
import { dataViewsService } from '../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataView } from 'src/plugins/data_views/common';

describe('delete runtime field', () => {
  it('call usageCollection', () => {
    const usageCollection = getUsageCollection();

    dataViewsService.get.mockImplementation(
      async (id: string) =>
        ({
          removeRuntimeField: jest.fn(),
          getRuntimeField: jest.fn().mockReturnValueOnce({}),
        } as unknown as DataView)
    );

    deleteRuntimeField({
      dataViewsService,
      counterName: 'DELETE /path',
      usageCollection,
      id: 'dataViewId',
      name: 'fieldName',
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
