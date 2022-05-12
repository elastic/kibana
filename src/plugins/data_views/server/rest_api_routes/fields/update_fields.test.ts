/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { updateFields } from './update_fields';
import { dataViewsService } from '../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataView } from '../../../common';

describe('create runtime field', () => {
  it('call usageCollection', () => {
    const usageCollection = getUsageCollection();

    dataViewsService.get.mockImplementation(
      async (id: string) =>
        ({
          addRuntimeField: jest.fn(),
          setFieldCount: jest.fn(),
          fields: {
            getByName: jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce({}),
          },
          getFieldsByRuntimeFieldName: jest.fn().mockReturnValueOnce({}),
        } as unknown as DataView)
    );

    updateFields({
      dataViewsService,
      counterName: 'POST /path',
      usageCollection,
      id: 'dataViewId',
      fields: { thisField: { count: 1 } },
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
