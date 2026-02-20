/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeProvider } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { render as rtlRender, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { coreServices, dataViewsService } from '../../../services/kibana_services';
import { getMockedFinalizeApi } from '../../mocks/control_mocks';
import { getOptionsListControlFactory } from './get_options_list_control_factory';

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: EuiThemeProvider });
};

describe('Options List Control Api', () => {
  const uuid = 'myControl1';
  const factory = getOptionsListControlFactory();
  const finalizeApi = getMockedFinalizeApi(uuid, factory);

  const getDataView = async (id: string): Promise<DataView> => {
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
  };

  describe('initialization', () => {
    let dataviewDelayPromise: Promise<void> | undefined;

    beforeAll(() => {
      dataViewsService.get = jest.fn().mockImplementation(async (id: string) => {
        if (dataviewDelayPromise) await dataviewDelayPromise;
        return getDataView(id);
      });
      coreServices.http.get = jest.fn().mockResolvedValue({
        allowExpensiveQueries: true,
      });
    });

    it('returns api immediately when no initial selections are configured', async () => {
      let resolveDataView: (() => void) | undefined;
      let apiReturned = false;
      dataviewDelayPromise = new Promise((res) => (resolveDataView = res));
      (async () => {
        await factory.buildEmbeddable({
          initialState: {
            dataViewId: 'myDataViewId',
            fieldName: 'myFieldName',
          },
          finalizeApi,
          uuid,
          parentApi: {},
        });
        apiReturned = true;
      })();
      await new Promise((r) => setTimeout(r, 1));
      expect(apiReturned).toBe(true);
      resolveDataView?.();
      dataviewDelayPromise = undefined;
    });

    it('waits until data view is available before returning api when initial selections are configured', async () => {
      let resolveDataView: (() => void) | undefined;
      let apiReturned = false;
      dataviewDelayPromise = new Promise((res) => (resolveDataView = res));
      (async () => {
        await factory.buildEmbeddable({
          initialState: {
            dataViewId: 'myDataViewId',
            fieldName: 'myFieldName',
            selectedOptions: ['cool', 'test'],
          },
          finalizeApi,
          uuid,
          parentApi: {},
        });
        apiReturned = true;
      })();

      // even after 10ms the API should not have returned yet because the data view was not available
      await new Promise((r) => setTimeout(r, 10));
      expect(apiReturned).toBe(false);

      // resolve the data view and ensure the api returns
      resolveDataView?.();
      await new Promise((r) => setTimeout(r, 10));
      expect(apiReturned).toBe(true);
      dataviewDelayPromise = undefined;
    });
  });

  describe('appliedFilters$', () => {
    beforeAll(() => {
      dataViewsService.get = jest.fn().mockImplementation(getDataView);
    });

    test('should not set appliedFilters$ when selectedOptions is not provided', async () => {
      const { api } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });
      expect(api.appliedFilters$.value).toBeUndefined();
    });

    test('should set appliedFilters$ when selectedOptions is provided', async () => {
      const { api } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['cool', 'test'],
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });
      expect(api.appliedFilters$.value).toEqual([
        {
          meta: {
            controlledBy: 'myControl1',
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

    test('should set appliedFilters$ when exists is selected', async () => {
      const { api } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });
      expect(api.appliedFilters$.value).toEqual([
        {
          meta: {
            controlledBy: 'myControl1',
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

    test('should set appliedFilters$ when exclude is selected', async () => {
      const { api } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
          exclude: true,
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });
      expect(api.appliedFilters$.value).toEqual([
        {
          meta: {
            controlledBy: 'myControl1',
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

  // FLAKY: https://github.com/elastic/kibana/issues/253466
  describe.skip('make selection', () => {
    beforeAll(() => {
      dataViewsService.get = jest.fn().mockImplementation(getDataView);
      coreServices.http.fetch = jest.fn().mockResolvedValue({
        suggestions: [
          { value: 'woof', docCount: 10 },
          { value: 'bark', docCount: 15 },
          { value: 'meow', docCount: 12 },
          { value: '', docCount: 20 },
        ],
      });
    });

    test('renders a "(blank)" option', async () => {
      const { Component } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });

      const control = render(<Component />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toBe(5);
      });
      const option = control.getByTestId('optionsList-control-selection-');
      await userEvent.click(option);
      await waitFor(async () => {
        expect(option).toBeChecked();
      });

      await userEvent.click(option);
      await waitFor(async () => {
        expect(option).not.toBeChecked();
      });
    });

    test('clicking another option unselects "Exists"', async () => {
      const { Component } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          existsSelected: true,
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });

      const control = render(<Component />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toBe(5);
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
      const { Component } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['woof', 'bark'],
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });

      const control = render(<Component />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toEqual(5);
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
      const { Component, api } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          selectedOptions: ['woof', 'bark'],
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });

      const control = render(<Component />);
      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toEqual(5);
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

      expect(api.appliedFilters$.value).toEqual([
        {
          meta: { controlledBy: 'myControl1', index: 'myDataViewId', key: 'myFieldName' },
          query: {
            match_phrase: {
              myFieldName: 'woof',
            },
          },
        },
      ]);
    });

    test('replace selection when singleSelect is true', async () => {
      const { Component, api } = await factory.buildEmbeddable({
        initialState: {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          singleSelect: true,
          selectedOptions: ['woof'],
        },
        finalizeApi,
        uuid,
        parentApi: {},
      });

      const control = render(<Component />);

      expect(api.appliedFilters$.value).toEqual([
        {
          meta: { controlledBy: 'myControl1', index: 'myDataViewId', key: 'myFieldName' },
          query: {
            match_phrase: {
              myFieldName: 'woof',
            },
          },
        },
      ]);

      await userEvent.click(control.getByTestId(`optionsList-control-${uuid}`));
      await waitFor(() => {
        expect(control.getAllByRole('option').length).toEqual(5);
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

      expect(api.appliedFilters$.value).toEqual([
        {
          meta: { controlledBy: 'myControl1', index: 'myDataViewId', key: 'myFieldName' },
          query: {
            match_phrase: {
              myFieldName: 'bark',
            },
          },
        },
      ]);
    });
  });
});
