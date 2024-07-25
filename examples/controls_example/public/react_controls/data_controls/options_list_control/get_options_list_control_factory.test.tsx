/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first, skip } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { stubFieldSpecMap } from '@kbn/data-views-plugin/common/field.stub';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

import { getMockedBuildApi, getMockedControlGroupApi } from '../../mocks/control_mocks';
import { getOptionsListControlFactory } from './get_options_list_control_factory';

describe('Options List Control Api', () => {
  const uuid = 'myControl1';
  const controlGroupApi = getMockedControlGroupApi();
  const mockDataViews = dataViewPluginMocks.createStartContract();
  const mockCore = coreMock.createStart();

  mockDataViews.get = jest.fn().mockImplementation(async (id: string): Promise<DataView> => {
    if (id !== 'myDataViewId') {
      throw new Error(`Simulated error: no data view found for id ${id}`);
    }
    const stubDataView = createStubDataView({
      spec: {
        id: 'myDataViewId',
        fields: {
          ...stubFieldSpecMap,
          myFieldName: {
            name: 'myFieldName',
            customLabel: 'My field name',
            type: 'string',
            esTypes: ['keyword'],
            aggregatable: true,
            searchable: true,
          },
        },
        title: 'logstash-*',
        timeFieldName: '@timestamp',
      },
    });
    return stubDataView;
  });

  const factory = getOptionsListControlFactory({
    core: mockCore,
    data: dataPluginMock.createStartContract(),
    dataViews: mockDataViews,
  });

  describe('filters$', () => {
    test('should not set filters$ when selectedOptions is not provided', (done) => {
      const { api } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );

      api.filters$.pipe(skip(1), first()).subscribe((filter) => {
        expect(filter).toBeUndefined();
        done();
      });
    });

    test('should set filters$ when selectedOptions is provided', (done) => {
      const { api } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['cool', 'test'],
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );
      api.filters$.pipe(skip(1), first()).subscribe((filter) => {
        expect(filter).toEqual([
          {
            meta: {
              index: 'myDataViewId',
              key: 'myFieldName',
              params: ['cool', 'test'],
              type: 'phrases',
            },
            query: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match_phrase: {
                      myFieldName: 'cool',
                    },
                  },
                  {
                    match_phrase: {
                      myFieldName: 'test',
                    },
                  },
                ],
              },
            },
          },
        ]);
        done();
      });
    });
  });
});
