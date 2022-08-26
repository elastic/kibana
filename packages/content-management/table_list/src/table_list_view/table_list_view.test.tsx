/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import React, { useEffect } from 'react';
import moment, { Moment } from 'moment';
import { act } from 'react-dom/test-utils';

import { WithServices } from '../__jest__';
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

const requiredProps: TableListViewProps = {
  entityName: 'test',
  entityNamePlural: 'tests',
  listingLimit: 500,
  initialFilter: '',
  initialPageSize: 20,
  tableListTitle: 'test title',
  findItems: jest.fn().mockResolvedValue({ total: 0, hits: [] }),
  getDetailViewLink: () => 'http://elastic.co',
};

describe('TableListView', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setup = registerTestBed<string, TableListViewProps>(
    WithServices<TableListViewProps>(TableListView),
    {
      defaultProps: { ...requiredProps },
      memoryRouter: { wrapComponent: false },
    }
  );

  test('render default empty prompt', async () => {
    let testBed: TestBed;

    await act(async () => {
      testBed = await setup();
    });

    const { component, exists } = testBed!;
    component.update();

    expect(component.find(EuiEmptyPrompt).length).toBe(1);
    expect(exists('newItemButton')).toBe(false);
  });

  // avoid trapping users in empty prompt that can not create new items
  test('render default empty prompt with create action when createItem supplied', async () => {
    let testBed: TestBed;

    await act(async () => {
      testBed = await setup({ createItem: () => undefined });
    });

    const { component, exists } = testBed!;
    component.update();

    expect(component.find(EuiEmptyPrompt).length).toBe(1);
    expect(exists('newItemButton')).toBe(true);
  });

  test('render custom empty prompt', async () => {
    let testBed: TestBed;

    const CustomEmptyPrompt = () => {
      return <EuiEmptyPrompt data-test-subj="custom-empty-prompt" title={<h1>Table empty</h1>} />;
    };

    await act(async () => {
      testBed = await setup({ emptyPrompt: <CustomEmptyPrompt /> });
    });

    const { component, exists } = testBed!;
    component.update();

    expect(exists('custom-empty-prompt')).toBe(true);
  });

  describe('default columns', () => {
    const twoDaysAgo = new Date(new Date().setDate(new Date().getDate() - 2));
    const twoDaysAgoToString = new Date(twoDaysAgo.getTime()).toDateString();
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const yesterdayToString = new Date(yesterday.getTime()).toDateString();
    const hits = [
      {
        id: '123',
        updatedAt: twoDaysAgo,
        attributes: {
          title: 'Item 1',
          description: 'Item 1 description',
        },
      },
      {
        id: '456',
        // This is the latest updated and should come first in the table
        updatedAt: yesterday,
        attributes: {
          title: 'Item 2',
          description: 'Item 2 description',
        },
      },
    ];

    test('should add a "Last updated" column if "updatedAt" is provided', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setup({
          findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 2', 'Item 2 description', yesterdayToString], // Comes first as it is the latest updated
        ['Item 1', 'Item 1 description', twoDaysAgoToString],
      ]);
    });

    test('should not display relative time for items updated more than 7 days ago', async () => {
      let testBed: TestBed;

      const updatedAtValues: Moment[] = [];

      const updatedHits = hits.map(({ id, attributes }, i) => {
        const updatedAt = new Date(new Date().setDate(new Date().getDate() - (7 + i)));
        updatedAtValues.push(moment(updatedAt));

        return {
          id,
          updatedAt,
          attributes,
        };
      });

      await act(async () => {
        testBed = await setup({
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
        // Renders the datetime with this format: "July 28, 2022"
        ['Item 1', 'Item 1 description', updatedAtValues[0].format('LL')],
        ['Item 2', 'Item 2 description', updatedAtValues[1].format('LL')],
      ]);
    });

    test('should not add a "Last updated" column if no "updatedAt" is provided', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setup({
          findItems: jest.fn().mockResolvedValue({
            total: hits.length,
            // Not including the "updatedAt" metadata
            hits: hits.map(({ attributes }) => ({ attributes })),
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
      let testBed: TestBed;

      await act(async () => {
        testBed = await setup({
          findItems: jest.fn().mockResolvedValue({
            total: hits.length + 1,
            hits: [
              ...hits,
              { id: '789', attributes: { title: 'Item 3', description: 'Item 3 description' } },
            ],
          }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 2', 'Item 2 description', yesterdayToString],
        ['Item 1', 'Item 1 description', twoDaysAgoToString],
        ['Item 3', 'Item 3 description', '-'], // Empty column as no updatedAt provided
      ]);
    });
  });

  describe('pagination', () => {
    const initialPageSize = 20;
    const totalItems = 30;

    const hits = [...Array(totalItems)].map((_, i) => ({
      attributes: {
        title: `Item ${i < 10 ? `0${i}` : i}`, // prefix with "0" for correct A-Z sorting
      },
    }));

    const props = {
      initialPageSize,
      findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
    };

    test('should limit the number of row to the `initialPageSize` provided', async () => {
      let testBed: TestBed;

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
      let testBed: TestBed;

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
