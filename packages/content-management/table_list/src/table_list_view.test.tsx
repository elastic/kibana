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
import {
  TableListView,
  Props as TableListViewProps,
  UserContentCommonSchema,
} from './table_list_view';

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
    jest.useFakeTimers('legacy');
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
    const hits: UserContentCommonSchema[] = [
      {
        id: '123',
        updatedAt: twoDaysAgo.toISOString(),
        type: 'dashboard',
        attributes: {
          title: 'Item 1',
          description: 'Item 1 description',
        },
        references: [],
      },
      {
        id: '456',
        // This is the latest updated and should come first in the table
        updatedAt: yesterday.toISOString(),
        type: 'dashboard',
        attributes: {
          title: 'Item 2',
          description: 'Item 2 description',
        },
        references: [],
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
        ['Item 2Item 2 description', yesterdayToString], // Comes first as it is the latest updated
        ['Item 1Item 1 description', twoDaysAgoToString],
      ]);
    });

    test('should not display relative time for items updated more than 7 days ago', async () => {
      let testBed: TestBed;

      const updatedAtValues: Moment[] = [];

      const updatedHits = hits.map(({ id, attributes, references }, i) => {
        const updatedAt = new Date(new Date().setDate(new Date().getDate() - (7 + i)));
        updatedAtValues.push(moment(updatedAt));

        return {
          id,
          updatedAt,
          attributes,
          references,
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
        ['Item 1Item 1 description', updatedAtValues[0].format('LL')],
        ['Item 2Item 2 description', updatedAtValues[1].format('LL')],
      ]);
    });

    test('should not add a "Last updated" column if no "updatedAt" is provided', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setup({
          findItems: jest.fn().mockResolvedValue({
            total: hits.length,
            // Not including the "updatedAt" metadata
            hits: hits.map(({ attributes, references }) => ({ attributes, references })),
          }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 1Item 1 description'], // Sorted by title
        ['Item 2Item 2 description'],
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
              {
                id: '789',
                attributes: { title: 'Item 3', description: 'Item 3 description' },
                references: [],
              },
            ],
          }),
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['Item 2Item 2 description', yesterdayToString],
        ['Item 1Item 1 description', twoDaysAgoToString],
        ['Item 3Item 3 description', '-'], // Empty column as no updatedAt provided
      ]);
    });
  });

  describe('pagination', () => {
    const initialPageSize = 20;
    const totalItems = 30;

    const hits: UserContentCommonSchema[] = [...Array(totalItems)].map((_, i) => ({
      id: `item${i}`,
      type: 'dashboard',
      updatedAt: new Date().toISOString(),
      attributes: {
        title: `Item ${i < 10 ? `0${i}` : i}`, // prefix with "0" for correct A-Z sorting
      },
      references: [],
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

  describe('column sorting', () => {
    const setupColumnSorting = registerTestBed<string, TableListViewProps>(
      WithServices<TableListViewProps>(TableListView, { TagList: getTagList({ references: [] }) }),
      {
        defaultProps: { ...requiredProps },
        memoryRouter: { wrapComponent: false },
      }
    );

    const getActions = (testBed: TestBed) => ({
      openSortSelect() {
        testBed.find('tableSortSelectBtn').at(0).simulate('click');
      },
    });

    const twoDaysAgo = new Date(new Date().setDate(new Date().getDate() - 2));
    const twoDaysAgoToString = new Date(twoDaysAgo.getTime()).toDateString();
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const yesterdayToString = new Date(yesterday.getTime()).toDateString();
    const hits: UserContentCommonSchema[] = [
      {
        id: '123',
        updatedAt: twoDaysAgo.toISOString(), // first asc, last desc
        type: 'dashboard',
        attributes: {
          title: 'z-foo', // first desc, last asc
        },
        references: [{ id: 'id-tag-1', name: 'tag-1', type: 'tag' }],
      },
      {
        id: '456',
        updatedAt: yesterday.toISOString(), // first desc, last asc
        type: 'dashboard',
        attributes: {
          title: 'a-foo', // first asc, last desc
        },
        references: [],
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
      const { openSortSelect } = getActions(testBed!);
      const { component, find } = testBed!;
      component.update();

      act(() => {
        openSortSelect();
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
      const { openSortSelect } = getActions(testBed!);
      component.update();

      let { tableCellsValues } = table.getMetaData('itemsInMemTable');

      expect(tableCellsValues).toEqual([
        ['a-foo', yesterdayToString],
        ['z-foo', twoDaysAgoToString],
      ]);

      act(() => {
        openSortSelect();
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
      const { openSortSelect } = getActions(testBed!);
      component.update();

      act(() => {
        openSortSelect();
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
        openSortSelect();
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

  describe('inspector', () => {
    const setupInspector = registerTestBed<string, TableListViewProps>(
      WithServices<TableListViewProps>(TableListView),
      {
        defaultProps: { ...requiredProps },
        memoryRouter: { wrapComponent: false },
      }
    );

    const hits: UserContentCommonSchema[] = [
      {
        id: '123',
        updatedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        attributes: {
          title: 'Item 1',
          description: 'Item 1 description',
        },
        references: [],
        type: 'dashboard',
      },
      {
        id: '456',
        updatedAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        attributes: {
          title: 'Item 2',
          description: 'Item 2 description',
        },
        references: [],
        type: 'dashboard',
      },
    ];

    test('should have an "inpect" button if the inspector is enabled', async () => {
      let testBed: TestBed;

      await act(async () => {
        testBed = await setupInspector({
          findItems: jest.fn().mockResolvedValue({ total: hits.length, hits }),
          inspector: { enabled: true },
        });
      });

      const { component, table } = testBed!;
      component.update();

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');
      expect(tableCellsValues[0][2]).toBe('Inspect Item 1');
      expect(tableCellsValues[1][2]).toBe('Inspect Item 2');
    });
  });

  describe('tag filtering', () => {
    const setupTagFiltering = registerTestBed<string, TableListViewProps>(
      WithServices<TableListViewProps>(TableListView, {
        getTagList: () => [
          { id: 'id-tag-1', name: 'tag-1', type: 'tag', description: '', color: '' },
          { id: 'id-tag-2', name: 'tag-2', type: 'tag', description: '', color: '' },
          { id: 'id-tag-3', name: 'tag-3', type: 'tag', description: '', color: '' },
          { id: 'id-tag-4', name: 'tag-4', type: 'tag', description: '', color: '' },
        ],
      }),
      {
        defaultProps: { ...requiredProps },
        memoryRouter: { wrapComponent: false },
      }
    );

    const hits: UserContentCommonSchema[] = [
      {
        id: '123',
        updatedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        type: 'dashboard',
        attributes: {
          title: 'Item 1',
          description: 'Item 1 description',
        },
        references: [
          { id: 'id-tag-1', name: 'tag-1', type: 'tag' },
          { id: 'id-tag-2', name: 'tag-2', type: 'tag' },
        ],
      },
      {
        id: '456',
        updatedAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        type: 'dashboard',
        attributes: {
          title: 'Item 2',
          description: 'Item 2 description',
        },
        references: [],
      },
    ];

    test('should filter by tag from the table', async () => {
      let testBed: TestBed;

      const findItems = jest.fn().mockResolvedValue({ total: hits.length, hits });

      await act(async () => {
        testBed = await setupTagFiltering({
          findItems,
        });
      });

      const { component, table, find } = testBed!;
      component.update();

      const getSearchBoxValue = () => find('tableListSearchBox').props().defaultValue;

      const getLastCallArgsFromFindItems = () =>
        findItems.mock.calls[findItems.mock.calls.length - 1];

      const { tableCellsValues } = table.getMetaData('itemsInMemTable');
      // "tag-1" and "tag-2" are rendered in the column
      expect(tableCellsValues[0][0]).toBe('Item 1Item 1 descriptiontag-1tag-2');

      await act(async () => {
        find('tag-id-tag-1').simulate('click');
      });
      component.update();

      // The search bar should be updated
      let expected = 'tag:(tag-1)';
      let [searchTerm] = getLastCallArgsFromFindItems();
      expect(getSearchBoxValue()).toBe(expected);
      expect(searchTerm).toBe(expected);

      await act(async () => {
        find('tag-id-tag-2').simulate('click');
      });
      component.update();

      expected = 'tag:(tag-1 or tag-2)';
      [searchTerm] = getLastCallArgsFromFindItems();
      expect(getSearchBoxValue()).toBe(expected);
      expect(searchTerm).toBe(expected);

      // Ctrl + click on a tag
      await act(async () => {
        find('tag-id-tag-2').simulate('click', { ctrlKey: true });
      });
      component.update();

      expected = 'tag:(tag-1) -tag:(tag-2)';
      [searchTerm] = getLastCallArgsFromFindItems();
      expect(getSearchBoxValue()).toBe(expected);
      expect(searchTerm).toBe(expected);
    });

    test('should filter by tag from the search bar filter', async () => {
      let testBed: TestBed;
      const findItems = jest.fn().mockResolvedValue({ total: hits.length, hits });

      await act(async () => {
        testBed = await setupTagFiltering({
          findItems,
        });
      });

      const { component, find, exists } = testBed!;
      component.update();

      const getSearchBoxValue = () => find('tableListSearchBox').props().defaultValue;

      const getLastCallArgsFromFindItems = () =>
        findItems.mock.calls[findItems.mock.calls.length - 1];

      const openTagFilterDropdown = async () => {
        await act(async () => {
          find('tagFilterPopoverButton').simulate('click');
        });
        component.update();
      };

      await openTagFilterDropdown();

      expect(exists('tagSelectableList')).toBe(true);
      await act(async () => {
        find('tag-searchbar-option-tag-1').simulate('click');
      });
      component.update();

      // The search bar should be updated and search term sent to the findItems() handler
      let expected = 'tag:(tag-1)';
      let [searchTerm] = getLastCallArgsFromFindItems();
      expect(getSearchBoxValue()).toBe(expected);
      expect(searchTerm).toBe(expected);

      // Ctrl + click one item
      await act(async () => {
        find('tag-searchbar-option-tag-2').simulate('click', { ctrlKey: true });
      });
      component.update();

      expected = 'tag:(tag-1) -tag:(tag-2)';
      [searchTerm] = getLastCallArgsFromFindItems();
      expect(getSearchBoxValue()).toBe(expected);
      expect(searchTerm).toBe(expected);
    });
  });
});
