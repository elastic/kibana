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
import type { ReactWrapper } from 'enzyme';

import { WithServices } from './__jest__';
import { getTagList } from './mocks';
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
        ['Item 2Item 2 descriptionelasticcloud', yesterdayToString], // Comes first as it is the latest updated
        ['Item 1Item 1 descriptionelasticcloud', twoDaysAgoToString],
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
        ['Item 1Item 1 descriptionelasticcloud', updatedAtValues[0].format('LL')],
        ['Item 2Item 2 descriptionelasticcloud', updatedAtValues[1].format('LL')],
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
        ['Item 1Item 1 descriptionelasticcloud'], // Sorted by title
        ['Item 2Item 2 descriptionelasticcloud'],
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
        ['Item 2Item 2 descriptionelasticcloud', yesterdayToString],
        ['Item 1Item 1 descriptionelasticcloud', twoDaysAgoToString],
        ['Item 3Item 3 descriptionelasticcloud', '-'], // Empty column as no updatedAt provided
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

      expect(firstRowTitle).toBe('Item 00elasticcloud');
      expect(lastRowTitle).toBe('Item 19elasticcloud');
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

      expect(firstRowTitle).toBe('Item 20elasticcloud');
      expect(lastRowTitle).toBe('Item 29elasticcloud');
    });
  });

  describe('column sorting', () => {
    const setupColumnSorting = registerTestBed<string, TableListViewProps>(
      WithServices<TableListViewProps>(TableListView, { TagList: getTagList({ tags: null }) }),
      {
        defaultProps: { ...requiredProps },
        memoryRouter: { wrapComponent: false },
      }
    );

    const twoDaysAgo = new Date(new Date().setDate(new Date().getDate() - 2));
    const twoDaysAgoToString = new Date(twoDaysAgo.getTime()).toDateString();
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const yesterdayToString = new Date(yesterday.getTime()).toDateString();
    const hits = [
      {
        id: '123',
        updatedAt: twoDaysAgo, // first asc, last desc
        attributes: {
          title: 'z-foo', // first desc, last asc
        },
      },
      {
        id: '456',
        updatedAt: yesterday, // first desc, last asc
        attributes: {
          title: 'a-foo', // first asc, last desc
        },
      },
    ];

    test('should initially sort by "Last updated" column', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setupColumnSorting({
          findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['a-foo', yesterdayToString],
        ['z-foo', twoDaysAgoToString],
      ]);
    });

    test('filter select should have 4 options', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setupColumnSorting({
          findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
        });
      });
      const { component, find } = testBed!;
      component.update();

      act(() => {
        find('tableSortSelectBtn').simulate('click');
      });
      component.update();

      const filterOptions = find('sortSelect').find('li');

      expect(filterOptions.length).toBe(4);
      expect(filterOptions.map((wrapper) => wrapper.text())).toEqual([
        'Name A-Z ',
        'Name Z-A ',
        'Recently updated - Checked option. ',
        'Least recently updated ',
      ]);
    });

    test('filter select should change the sort order', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setupColumnSorting({
          findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
        });
      });

      const { component, table, find } = testBed!;
      component.update();

      let { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['a-foo', yesterdayToString],
        ['z-foo', twoDaysAgoToString],
      ]);

      act(() => {
        find('tableSortSelectBtn').simulate('click');
      });
      component.update();
      const filterOptions = find('sortSelect').find('li');

      // Click 'Name Z-A'
      act(() => {
        filterOptions.at(1).simulate('click');
      });
      component.update();

      ({ tableCellsValues } = table.getMetaData('itemsInMemTable'));

      expect(tableCellsValues).toEqual([
        ['z-foo', twoDaysAgoToString],
        ['a-foo', yesterdayToString],
      ]);
    });

    test('should update the select option when toggling the column header', async () => {
      const getTableColumnSortButton = (testBed: TestBed, text: string) => {
        const buttons = testBed.find('tableHeaderSortButton');
        let wrapper: ReactWrapper | undefined;

        buttons.forEach((_wrapper) => {
          if (wrapper) {
            return;
          }

          if (_wrapper.text().includes(text)) {
            wrapper = _wrapper;
          }
        });
        return wrapper;
      };

      let testBed: TestBed;

      await act(async () => {
        testBed = await setupColumnSorting({
          findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
        });
      });

      const { component, table, find } = testBed!;
      component.update();

      act(() => {
        find('tableSortSelectBtn').simulate('click');
      });
      component.update();
      let filterOptions = find('sortSelect').find('li');
      expect(filterOptions.map((wrapper) => wrapper.text())).toEqual([
        'Name A-Z ',
        'Name Z-A ',
        'Recently updated - Checked option. ', // checked
        'Least recently updated ',
      ]);

      const nameColumnHeaderButton = getTableColumnSortButton(testBed!, 'Name');
      if (!nameColumnHeaderButton) {
        throw new Error('Could not find table header button containing "Name".');
      }

      act(() => {
        nameColumnHeaderButton.simulate('click');
      });
      component.update();
      let { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['a-foo', yesterdayToString],
        ['z-foo', twoDaysAgoToString],
      ]);

      act(() => {
        nameColumnHeaderButton.simulate('click');
      });
      component.update();
      ({ tableCellsValues } = table.getMetaData('itemsInMemTable'));

      expect(tableCellsValues).toEqual([
        ['z-foo', twoDaysAgoToString],
        ['a-foo', yesterdayToString],
      ]);

      act(() => {
        find('tableSortSelectBtn').simulate('click');
      });
      component.update();
      filterOptions = find('sortSelect').find('li');

      expect(filterOptions.map((wrapper) => wrapper.text())).toEqual([
        'Name A-Z ',
        'Name Z-A - Checked option. ', // now this option is checked
        'Recently updated ',
        'Least recently updated ',
      ]);
    });
  });
});
