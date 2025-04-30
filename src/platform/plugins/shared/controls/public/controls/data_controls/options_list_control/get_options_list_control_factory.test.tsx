/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { coreServices, dataViewsService } from '../../../services/kibana_services';
import { getMockedBuildApi, getMockedControlGroupApi } from '../../mocks/control_mocks';
import * as initializeControl from '../initialize_data_control';
import { getOptionsListControlFactory } from './get_options_list_control_factory';

describe('Options List Control Api', () => {
  const uuid = 'myControl1';
  const controlGroupApi = getMockedControlGroupApi();

  dataViewsService.get = jest.fn().mockImplementation(async (id: string): Promise<DataView> => {
    if (id !== 'myDataViewId') {
      throw new Error(`Simulated error: no data view found for id ${id}`);
    }
    const stubDataView = createStubDataView({
      spec: {
        id: 'myDataViewId',
        fields: {
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
    stubDataView.getFormatterForField = jest.fn().mockImplementation(() => {
      return {
        getConverterFor: () => {
          return (value: string) => `${value}:formatted`;
        },
        toJSON: (value: any) => JSON.stringify(value),
      };
    });
    return stubDataView;
  });

  const factory = getOptionsListControlFactory();

  describe('filters$', () => {
    test('should not set filters$ when selectedOptions is not provided', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toBeUndefined();
    });

    test('should set filters$ when selectedOptions is provided', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['cool', 'test'],
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toEqual([
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
    });

    test('should set filters$ when exists is selected', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toEqual([
        {
          meta: {
            index: 'myDataViewId',
            key: 'myFieldName',
          },
          query: {
            exists: {
              field: 'myFieldName',
            },
          },
        },
      ]);
    });

    test('should set filters$ when exclude is selected', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
          exclude: true,
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toEqual([
        {
          meta: {
            index: 'myDataViewId',
            key: 'myFieldName',
            negate: true,
          },
          query: {
            exists: {
              field: 'myFieldName',
            },
          },
        },
      ]);
    });
  });

  describe('make selection', () => {
    beforeAll(() => {
      coreServices.http.fetch = jest.fn().mockResolvedValue({
        suggestions: [
          { value: 'woof', docCount: 10 },
          { value: 'bark', docCount: 15 },
          { value: 'meow', docCount: 12 },
        ],
      });
    });

    test('clicking another option unselects "Exists"', async () => {
      const { Component } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );

      const control = render(<Component className={'controlPanel'} />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toBe(4);
      });

      expect(control.getByTestId('optionsList-control-selection-exists')).toBeChecked();
      const option = control.getByTestId('optionsList-control-selection-woof');

      await userEvent.click(option);
      await waitFor(async () => {
        expect(option).toBeChecked();
      });

      expect(control.getByTestId('optionsList-control-selection-exists')).not.toBeChecked();
    });

    test('clicking "Exists" unselects all other selections', async () => {
      const { Component } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['woof', 'bark'],
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );

      const control = render(<Component className={'controlPanel'} />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toEqual(4);
      });

      const existsOption = control.getByTestId('optionsList-control-selection-exists');
      expect(existsOption).not.toBeChecked();
      expect(control.getByTestId('optionsList-control-selection-woof')).toBeChecked();
      expect(control.getByTestId('optionsList-control-selection-bark')).toBeChecked();
      expect(control.getByTestId('optionsList-control-selection-meow')).not.toBeChecked();

      await userEvent.click(existsOption);
      await waitFor(async () => {
        expect(existsOption).toBeChecked();
      });

      expect(control.getByTestId('optionsList-control-selection-woof')).not.toBeChecked();
      expect(control.getByTestId('optionsList-control-selection-bark')).not.toBeChecked();
      expect(control.getByTestId('optionsList-control-selection-meow')).not.toBeChecked();
    });

    test('deselects when showOnlySelected is true', async () => {
      const { Component, api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['woof', 'bark'],
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );

      const control = render(<Component className={'controlPanel'} />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toEqual(4);
      });
      await userEvent.click(control.getByTestId('optionsList-control-show-only-selected'));

      expect(control.getByTestId('optionsList-control-selection-woof')).toBeChecked();
      expect(control.getByTestId('optionsList-control-selection-bark')).toBeChecked();
      expect(control.queryByTestId('optionsList-control-selection-meow')).toBeNull();

      await userEvent.click(control.getByTestId('optionsList-control-selection-bark'));
      await waitFor(async () => {
        expect(control.getByTestId('optionsList-control-selection-woof')).toBeChecked();
      });

      expect(control.queryByTestId('optionsList-control-selection-bark')).toBeNull();
      expect(control.queryByTestId('optionsList-control-selection-meow')).toBeNull();

      expect(api.filters$.value).toEqual([
        {
          meta: {
            index: 'myDataViewId',
            key: 'myFieldName',
          },
          query: {
            match_phrase: {
              myFieldName: 'woof',
            },
          },
        },
      ]);
    });

    test('replace selection when singleSelect is true', async () => {
      const { Component, api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          singleSelect: true,
          selectedOptions: ['woof'],
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
        uuid,
        controlGroupApi
      );

      const control = render(<Component className={'controlPanel'} />);

      expect(api.filters$.value).toEqual([
        {
          meta: {
            index: 'myDataViewId',
            key: 'myFieldName',
          },
          query: {
            match_phrase: {
              myFieldName: 'woof',
            },
          },
        },
      ]);

      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toEqual(4);
      });
      expect(control.getByTestId('optionsList-control-selection-woof')).toBeChecked();
      expect(control.queryByTestId('optionsList-control-selection-bark')).not.toBeChecked();
      expect(control.queryByTestId('optionsList-control-selection-meow')).not.toBeChecked();

      await userEvent.click(control.getByTestId('optionsList-control-selection-bark'));
      await waitFor(async () => {
        expect(control.getByTestId('optionsList-control-selection-woof')).not.toBeChecked();
      });

      expect(control.queryByTestId('optionsList-control-selection-bark')).toBeChecked();
      expect(control.queryByTestId('optionsList-control-selection-meow')).not.toBeChecked();

      expect(api.filters$.value).toEqual([
        {
          meta: {
            index: 'myDataViewId',
            key: 'myFieldName',
          },
          query: {
            match_phrase: {
              myFieldName: 'bark',
            },
          },
        },
      ]);
    });
  });

  test('ensure initialize data control contains all editor state', async () => {
    const initializeSpy = jest.spyOn(initializeControl, 'initializeDataControl');
    const initialState = {
      dataViewId: 'myDataViewId',
      fieldName: 'myFieldName',
      runPastTimeout: true,
    };
    await factory.buildControl(
      {
        dataViewId: 'myDataViewId',
        fieldName: 'myFieldName',
        runPastTimeout: true,
      },
      getMockedBuildApi(uuid, factory, controlGroupApi),
      uuid,
      controlGroupApi
    );
    expect(initializeSpy).toHaveBeenCalledWith(
      uuid,
      'optionsListControl',
      'optionsListDataView',
      initialState,
      {
        searchTechnique: expect.anything(),
        singleSelect: expect.anything(),
        runPastTimeout: expect.anything(),
      },
      controlGroupApi
    );
  });
});
