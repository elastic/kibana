/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { ToastsStart } from '@kbn/core/public';
import React, { useEffect } from 'react';
import moment, { Moment } from 'moment';
import { act } from 'react-dom/test-utils';
import { themeServiceMock, applicationServiceMock } from '@kbn/core/public/mocks';
import { TableListView, Props as TableListViewProps } from './table_list_view';

const mockUseEffect = useEffect;

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (handler: () => void) => handler,
  };
});

jest.mock('react-use/lib/useDebounce', () => {
  return (cb: () => void, ms: number, deps: any[]) => {
    mockUseEffect(() => {
      cb();
    }, deps);
  };
});

const requiredProps: TableListViewProps<Record<string, unknown>> = {
  entityName: 'test',
  entityNamePlural: 'tests',
  listingLimit: 500,
  initialFilter: '',
  initialPageSize: 20,
  tableColumns: [],
  tableListTitle: 'test title',
  rowHeader: 'name',
  tableCaption: 'test caption',
  toastNotifications: {} as ToastsStart,
  findItems: jest.fn(() => Promise.resolve({ total: 0, hits: [] })),
  theme: themeServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
};

describe('TableListView', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  type Props = TableListViewProps<Record<string, unknown>>;

  let testBed: TestBed;

  const defaultProps: Props = {
    ...requiredProps,
    tableColumns: [],
    findItems: () => Promise.resolve({ total: 0, hits: [] }),
  };

  const setup = registerTestBed<string, Props>(TableListView, {
    defaultProps,
    memoryRouter: { wrapComponent: false },
  });

  test('render default empty prompt', async () => {
    await act(async () => {
      testBed = await setup();
    });

    const { component, exists } = testBed;
    component.update();

    expect(component.find(EuiEmptyPrompt).length).toBe(1);
    expect(exists('newItemButton')).toBe(false);
  });

  // avoid trapping users in empty prompt that can not create new items
  test('render default empty prompt with create action when createItem supplied', async () => {
    await act(async () => {
      testBed = await setup({ createItem: () => undefined });
    });

    const { component, exists } = testBed;
    component.update();

    expect(component.find(EuiEmptyPrompt).length).toBe(1);
    expect(exists('newItemButton')).toBe(true);
  });

  test('render custom empty prompt', async () => {
    const CustomEmptyPrompt = () => {
      return <EuiEmptyPrompt data-test-subj="custom-empty-prompt" title={<h1>Table empty</h1>} />;
    };

    await act(async () => {
      testBed = await setup({ emptyPrompt: <CustomEmptyPrompt /> });
    });

    const { component, exists } = testBed;
    component.update();

    expect(exists('custom-empty-prompt')).toBe(true);
  });

  describe('default columns', () => {
    const twoDaysAgo = new Date(new Date().setDate(new Date().getDate() - 2));
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));

    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
        sortable: true,
      },
      {
        field: 'description',
        name: 'Description',
        sortable: true,
      },
    ];

    const hits = [
      {
        title: 'Item 1',
        description: 'Item 1 description',
        updatedAt: twoDaysAgo,
      },
      {
        title: 'Item 2',
        description: 'Item 2 description',
        // This is the latest updated and should come first in the table
        updatedAt: yesterday,
      },
    ];

    const findItems = jest.fn().mockResolvedValue({ total: hits.length, hits });

    const props = {
      // initialPageSize,
      tableColumns,
      findItems,
    };

    test('should add a "Last updated" column if "updatedAt" is provided', async () => {
      await act(async () => {
        testBed = await setup(props);
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 2', 'Item 2 description', 'yesterday'], // Comes first as it is the latest updated
        ['Item 1', 'Item 1 description', '2 days ago'],
      ]);
    });

    test('should not display relative time for items updated more than 7 days ago', async () => {
      const updatedAtValues: Moment[] = [];

      const updatedHits = hits.map(({ title, description }, i) => {
        const updatedAt = new Date(new Date().setDate(new Date().getDate() - (7 + i)));
        updatedAtValues[i] = moment(updatedAt);

        return {
          title,
          description,
          updatedAt,
        };
      });

      await act(async () => {
        testBed = await setup({
          ...props,
          findItems: jest.fn().mockResolvedValue({
            total: updatedHits.length,
            hits: updatedHits,
          }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        // Renders the datetime with this format: "05/10/2022 @ 2:34 PM"
        ['Item 1', 'Item 1 description', updatedAtValues[0].format('LL')],
        ['Item 2', 'Item 2 description', updatedAtValues[1].format('LL')],
      ]);
    });

    test('should not add a "Last updated" column if no "updatedAt" is provided', async () => {
      await act(async () => {
        testBed = await setup({
          ...props,
          findItems: jest.fn().mockResolvedValue({
            total: hits.length,
            // Only "title" and "description"
            hits: hits.map(({ title, description }) => ({ title, description })),
          }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 1', 'Item 1 description'], // Sorted by title
        ['Item 2', 'Item 2 description'],
      ]);
    });

    test('should not display anything if there is no updatedAt metadata for an item', async () => {
      await act(async () => {
        testBed = await setup({
          ...props,
          findItems: jest.fn().mockResolvedValue({
            total: hits.length + 1,
            hits: [...hits, { title: 'Item 3', description: 'Item 3 description' }],
          }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 2', 'Item 2 description', 'yesterday'],
        ['Item 1', 'Item 1 description', '2 days ago'],
        ['Item 3', 'Item 3 description', '-'], // Empty column as no updatedAt provided
      ]);
    });
  });

  describe('pagination', () => {
    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
        sortable: true,
      },
    ];

    const initialPageSize = 20;
    const totalItems = 30;

    const hits = new Array(totalItems).fill(' ').map((_, i) => ({
      title: `Item ${i < 10 ? `0${i}` : i}`, // prefix with "0" for correct A-Z sorting
    }));

    const findItems = jest.fn().mockResolvedValue({ total: hits.length, hits });

    const props = {
      ...requiredProps,
      initialPageSize,
      tableColumns,
      findItems,
    };

    test('should limit the number of row to the `initialPageSize` provided', async () => {
      await act(async () => {
        testBed = await setup(props);
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');
      expect(tableCellsValues.length).toBe(requiredProps.initialPageSize);

      const [[firstRowTitle]] = tableCellsValues;
      const [lastRowTitle] = tableCellsValues[tableCellsValues.length - 1];

      expect(firstRowTitle).toBe('Item 00');
      expect(lastRowTitle).toBe('Item 19');
    });

    test('should navigate to page 2', async () => {
      await act(async () => {
        testBed = await setup(props);
      });

      const { component, table } = testBed!;
      component.update();

      const pageLinks = component.find('.euiPagination__list .euiPagination__item');
      expect(pageLinks.length).toBe(Math.ceil(totalItems / initialPageSize));

      act(() => {
        // Click on page 2
        pageLinks.at(1).find('a').simulate('click');
      });
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');
      expect(tableCellsValues.length).toBe(totalItems - initialPageSize);

      const [[firstRowTitle]] = tableCellsValues;
      const [lastRowTitle] = tableCellsValues[tableCellsValues.length - 1];

      expect(firstRowTitle).toBe('Item 20');
      expect(lastRowTitle).toBe('Item 29');
    });
  });
});
