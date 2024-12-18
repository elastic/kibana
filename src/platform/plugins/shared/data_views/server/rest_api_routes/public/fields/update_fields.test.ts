/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateFields } from './update_fields';
import { dataViewsService } from '../../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataViewLazy } from '../../../../common';

describe('create runtime field', () => {
  it('call usageCollection', async () => {
    const usageCollection = getUsageCollection();

    dataViewsService.getDataViewLazy.mockImplementation(
      async (id: string) =>
        ({
          addRuntimeField: jest.fn(),
          setFieldCount: jest.fn(),
          fields: {
            getByName: jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce({}),
          },
          getFieldsByRuntimeFieldName: jest.fn().mockReturnValueOnce({}),
        } as unknown as DataViewLazy)
    );

    await updateFields({
      dataViewsService,
      counterName: 'POST /path',
      usageCollection,
      id: 'dataViewId',
      fields: { thisField: { count: 1 } },
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
