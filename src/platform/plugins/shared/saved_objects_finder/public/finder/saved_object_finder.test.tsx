/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSearchBarProps, IconType } from '@elastic/eui';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import lodash from 'lodash';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, screen, waitFor, within } from '@testing-library/react';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { EuiButton, Query } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import {
  SavedObjectFinderWithoutPersist as SavedObjectFinder,
  SavedObjectFinderUi,
} from './saved_object_finder';

type SavedObjectFinderProps = React.ComponentProps<typeof SavedObjectFinder>;

type MockSearch = jest.MockedFunction<
  (...args: Parameters<SavedObjectFinderProps['services']['contentClient']['mSearch']>) => Promise<{
    hits: unknown[];
  }>
>;

let capturedTableSearch: EuiSearchBarProps | undefined;

jest.spyOn(lodash, 'debounce').mockImplementation((fn: any) => {
  fn.cancel = jest.fn();

  return fn;
});

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  const ActualEuiInMemoryTable = actual.EuiInMemoryTable;

  const EuiInMemoryTable = (props: React.ComponentProps<typeof ActualEuiInMemoryTable>) => {
    // Keep the real table rendering, but expose its search config for focused filter assertions.
    capturedTableSearch = typeof props.search === 'object' ? props.search : undefined;

    return <ActualEuiInMemoryTable {...props} />;
  };

  return {
    ...actual,
    EuiInMemoryTable,
  };
});

const euiTableWidthWarning = 'Detected not recommended unit';

const doc = {
  id: '1',
  type: 'search',
  attributes: { title: 'Example title', description: 'example description' },
};

const doc2 = {
  id: '2',
  type: 'search',
  attributes: { title: 'Another title', description: 'another description' },
};

const doc3 = { type: 'vis', id: '3', attributes: { title: 'Vis' } };

const doc4 = { type: 'search', id: '4', attributes: { title: 'Search' } };

const searchMetaData = [
  {
    defaultSearchField: 'name',
    getIconForSavedObject: () => 'search' as IconType,
    name: 'Search',
    showSavedObject: () => true,
    type: 'search',
  },
];

const metaDataConfig = [
  {
    getIconForSavedObject: () => 'search' as IconType,
    name: 'Search',
    type: 'search',
  },
  {
    getIconForSavedObject: () => 'document' as IconType,
    name: 'Vis',
    type: 'vis',
  },
];

const baseProps = {
  id: 'foo',
  euiTablePersist: {
    pageSize: 10,
    onTableChange: () => {},
    sorting: { sort: { direction: 'asc' as const, field: 'title' as const } },
  },
};

const contentManagement = contentManagementMock.createStartContract();
const contentClient = contentManagement.client;
const mockSearch = contentClient.mSearch as unknown as MockSearch;

const coreStart = coreMock.createStart();
const uiSettings = coreStart.uiSettings;

uiSettings.get.mockImplementation(() => 10);

const savedObjectsTagging = {
  ui: {
    convertNameToReference: jest.fn((name: string) => ({ type: 'tag', id: name })),
    getSearchBarFilter: jest.fn(() => ({
      field: 'tag',
      multiSelect: 'or',
      name: 'Tags',
      options: [],
      type: 'field_value_selection',
    })),
    getTableColumnDefinition: jest.fn(() => ({
      'data-test-subj': 'listingTableRowTags',
      description: 'Tags associated with this saved object',
      field: 'references',
      name: 'Tags',
      render: (_: any, item: any) => <span>{`tag-${item.id}`}</span>,
      sortable: (item: any) => `tag-${item.id}`,
    })),
  },
} as any as SavedObjectsTaggingApi;

const getResultsTable = () => screen.getByTestId('savedObjectsFinderTable');

const getTitleLinkTexts = () =>
  within(getResultsTable())
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('button')[0].textContent ?? '');

const clickColumnSortButton = async (
  columnName: string,
  user: ReturnType<typeof userEvent.setup>
) => {
  const headerCell = within(getResultsTable()).getByRole('columnheader', {
    name: new RegExp(columnName),
  });

  await user.click(within(headerCell).getByRole('button'));
};

const renderFinder = (
  props: SavedObjectFinderProps,
  Component: typeof SavedObjectFinder | typeof SavedObjectFinderUi = SavedObjectFinder
) => renderWithI18n(<Component {...props} />);

const waitForItemsLoaded = async (visibleTitle = doc.attributes.title) => {
  await waitFor(() => {
    expect(mockSearch).toHaveBeenCalled();
  });

  expect(await screen.findByText(visibleTitle)).toBeVisible();
};

const typeSearchQuery = async (value: string) => {
  const user = userEvent.setup();

  const input = await screen.findByRole('searchbox');

  await user.clear(input);
  await user.type(input, `${value}{enter}`);
};

const updateTableSearch = async (
  search: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]
) => {
  expect(capturedTableSearch?.onChange).toBeDefined();

  await act(async () => {
    capturedTableSearch?.onChange?.(search);
    await Promise.resolve();
  });
};

describe('SavedObjectsFinder', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    const originalConsoleWarn = globalThis.console.warn.bind(globalThis.console);

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
      if (typeof args[0] === 'string' && args[0].includes(euiTableWidthWarning)) return;

      originalConsoleWarn(...args);
    });
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    mockSearch.mockClear();
    capturedTableSearch = undefined;
  });

  it('should call API on startup', async () => {
    mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc] }));

    renderFinder({
      ...baseProps,
      savedObjectMetaData: searchMetaData,
      services: {
        contentClient,
        savedObjectsTagging,
        uiSettings,
      },
    });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith({
        contentTypes: [{ contentTypeId: 'search' }],
        query: { limit: 10 },
      });
    });
  });

  describe('render', () => {
    it('lists initial items', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitFor(() => {
        expect(screen.getByText(doc.attributes.title)).toBeVisible();
      });
    });

    it('calls onChoose on item click', async () => {
      const onChoose = jest.fn();
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc] }));

      const user = userEvent.setup();
      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
        onChoose,
      });

      const titleLink = await screen.findByText(doc.attributes.title);

      await user.click(titleLink);

      expect(onChoose).toHaveBeenCalledWith('1', 'search', `${doc.attributes.title} (Search)`, doc);
    });

    it('with help text', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc] }));

      renderFinder({
        ...baseProps,
        helpText: 'This is some description about the action',
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitFor(() => {
        expect(screen.getByText('This is some description about the action')).toBeVisible();
      });
    });

    it('with left button', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc] }));

      const button = <EuiButton>Hello</EuiButton>;

      renderFinder({
        ...baseProps,
        leftChildren: button,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      expect(await screen.findByText('Hello')).toBeVisible();
    });

    it('render description if provided', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2, doc4] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitFor(() => {
        expect(screen.getByText(doc.attributes.description)).toBeVisible();
        expect(screen.getByText(doc2.attributes.description)).toBeVisible();
      });
    });
  });

  describe('sorting', () => {
    it('should list items by type ascending', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc3, doc2] }));

      const user = userEvent.setup();

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await clickColumnSortButton('Type', user);

      expect(getTitleLinkTexts()).toEqual([
        doc.attributes.title,
        doc2.attributes.title,
        doc3.attributes.title,
      ]);
    });

    it('should list items by type descending', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc3, doc2] }));

      const user = userEvent.setup();

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await clickColumnSortButton('Type', user);
      await clickColumnSortButton('Type', user);

      expect(getTitleLinkTexts()).toEqual([
        doc3.attributes.title,
        doc.attributes.title,
        doc2.attributes.title,
      ]);
    });

    it('should list items by title ascending', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();

      expect(getTitleLinkTexts()).toEqual([doc2.attributes.title, doc.attributes.title]);
    });

    it('should list items by title descending', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

      const user = userEvent.setup();

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await clickColumnSortButton('Title', user);

      expect(getTitleLinkTexts()).toEqual([doc.attributes.title, doc2.attributes.title]);
    });

    it('should list items by tag ascending', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc3, doc2] }));

      const user = userEvent.setup();

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await clickColumnSortButton('Tags', user);

      expect(getTitleLinkTexts()).toEqual([
        doc.attributes.title,
        doc2.attributes.title,
        doc3.attributes.title,
      ]);
    });

    it('should list items by tag descending', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc3, doc2] }));

      const user = userEvent.setup();

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await clickColumnSortButton('Tags', user);
      await clickColumnSortButton('Tags', user);

      expect(getTitleLinkTexts()).toEqual([
        doc3.attributes.title,
        doc2.attributes.title,
        doc.attributes.title,
      ]);
    });
  });

  it('should not show the saved objects which get filtered by showSavedObject', async () => {
    mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

    renderFinder({
      ...baseProps,
      savedObjectMetaData: [
        {
          getIconForSavedObject: () => 'search',
          name: 'Search',
          showSavedObject: ({ id }) => id !== '1',
          type: 'search',
        },
      ],
      services: { contentClient, savedObjectsTagging, uiSettings },
    });

    await waitFor(() => {
      expect(screen.getByText(doc2.attributes.title)).toBeVisible();
    });
    expect(screen.queryByText(doc.attributes.title)).not.toBeInTheDocument();
  });

  describe('search', () => {
    it('should request filtered list on search input', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await typeSearchQuery('abc');

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith({
          contentTypes: [
            {
              contentTypeId: 'search',
            },
          ],
          query: { limit: 10, text: 'abc*' },
        });
      });
    });

    it('should respect response order on search input', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();
      await typeSearchQuery('abc');

      await waitFor(() => {
        expect(getTitleLinkTexts()).toEqual([doc.attributes.title, doc2.attributes.title]);
      });
    });
  });

  it('should request multiple saved object types at once', async () => {
    mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

    renderFinder({
      ...baseProps,
      savedObjectMetaData: [
        {
          getIconForSavedObject: () => 'search',
          name: 'Search',
          type: 'search',
        },
        {
          getIconForSavedObject: () => 'chartLine',
          name: 'Vis',
          type: 'vis',
        },
      ],
      services: { contentClient, savedObjectsTagging, uiSettings },
    });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith({
        contentTypes: [
          {
            contentTypeId: 'search',
          },
          {
            contentTypeId: 'vis',
          },
        ],
        query: { limit: 10, text: undefined },
      });
    });
  });

  describe('filter', () => {
    it('should render filter buttons if enabled', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2, doc3] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
        showFilter: true,
      });

      await waitForItemsLoaded();

      expect(screen.getByText('Types')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Tags Selection' })).toBeVisible();
    });

    it('should not render filter buttons if disabled', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2, doc3] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
        showFilter: false,
      });

      await waitForItemsLoaded();

      expect(screen.queryByText('Types')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Tags Selection' })).not.toBeInTheDocument();
    });

    it('should not render types filter button if there is only one type in the metadata list', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
        showFilter: true,
      });

      await waitForItemsLoaded();

      expect(screen.queryByText('Types')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tags Selection' })).toBeVisible();
    });

    it('should not render tags filter button if savedObjectsTagging is undefined', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2, doc3] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging: undefined, uiSettings },
        showFilter: true,
      });

      await waitForItemsLoaded();

      expect(screen.getByText('Types')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Tags Selection' })).not.toBeInTheDocument();
    });

    it('should apply types filter if selected', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2, doc3] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
        showFilter: true,
      });

      await waitForItemsLoaded();

      await updateTableSearch({
        error: null,
        query: Query.parse('type:(vis)'),
        queryText: '',
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenLastCalledWith({
          contentTypes: [
            {
              contentTypeId: 'vis',
            },
          ],
          query: { limit: 10, text: undefined },
        });
      });

      await updateTableSearch({
        query: Query.parse('type:(search or vis)'),
        queryText: '',
        error: null,
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenLastCalledWith({
          contentTypes: [
            {
              contentTypeId: 'search',
            },
            {
              contentTypeId: 'vis',
            },
          ],
          query: { limit: 10, text: undefined },
        });
      });
    });

    it('should apply tags filter if selected', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: [doc, doc2, doc3] }));

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
        showFilter: true,
      });

      await waitForItemsLoaded();

      await updateTableSearch({
        error: null,
        query: Query.parse('tag:(tag1)'),
        queryText: '',
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenLastCalledWith({
          contentTypes: [
            {
              contentTypeId: 'search',
            },
            {
              contentTypeId: 'vis',
            },
          ],
          query: {
            limit: 10,
            text: undefined,
            tags: {
              included: ['tag1'],
            },
          },
        });
      });

      await updateTableSearch({
        error: null,
        query: Query.parse('tag:(tag1 or tag2)'),
        queryText: '',
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenLastCalledWith({
          contentTypes: [
            {
              contentTypeId: 'search',
            },
            {
              contentTypeId: 'vis',
            },
          ],
          query: {
            limit: 10,
            text: undefined,
            tags: {
              included: ['tag1', 'tag2'],
            },
          },
        });
      });
    });
  });

  it('should display no items message if there are no items', async () => {
    mockSearch.mockImplementation(() => Promise.resolve({ hits: [] }));

    const noItemsMessage = <span>No saved objects found</span>;

    renderFinder({
      ...baseProps,
      noItemsMessage,
      savedObjectMetaData: searchMetaData,
      services: { contentClient, savedObjectsTagging, uiSettings },
    });

    expect(await screen.findByText('No saved objects found')).toBeVisible();
  });

  describe('pagination', () => {
    const createItemList = (length: number) =>
      new Array(length).fill(undefined).map((_, i) => ({
        attributes: {
          title: `Title ${i < 10 ? '0' : ''}${i}`,
        },
        id: String(i),
        type: 'search',
      }));
    const pageSizeItemList = createItemList(16);
    const paginatedItemList = createItemList(20);
    const fixedPageSizeItemList = createItemList(15);

    it('should show a table pagination with initial per page', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: pageSizeItemList }));

      renderFinder({
        euiTablePersist: {
          ...baseProps.euiTablePersist,
          pageSize: 15,
        },
        id: 'foo',
        initialPageSize: 15,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded('Title 00');

      expect(screen.getByText(/Rows per page: 15/)).toBeVisible();
      expect(getTitleLinkTexts()).toHaveLength(15);
    });

    it('should allow switching the page size', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: pageSizeItemList }));

      const user = userEvent.setup();

      renderFinder({
        euiTablePersist: {
          ...baseProps.euiTablePersist,
          pageSize: 5,
        },
        id: 'foo',
        initialPageSize: 15,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded('Title 00');

      await user.click(screen.getByTestId('tablePaginationPopoverButton'));
      await user.click(screen.getByTestId('tablePagination-5-rows'));

      await waitFor(() => {
        expect(getTitleLinkTexts()).toHaveLength(5);
      });
    });

    it('should switch page correctly', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: paginatedItemList }));

      const user = userEvent.setup();

      renderFinder(
        {
          euiTablePersist: baseProps.euiTablePersist,
          id: 'foo',
          initialPageSize: 15,
          savedObjectMetaData: searchMetaData,
          services: { contentClient, savedObjectsTagging, uiSettings },
        },
        SavedObjectFinderUi
      );

      await waitForItemsLoaded('Title 00');
      expect(getTitleLinkTexts()).toHaveLength(15);

      await user.click(screen.getByTestId('pagination-button-next'));

      await waitFor(() => {
        expect(getTitleLinkTexts()).toHaveLength(5);
      });
    });

    it('should show an ordinary pagination for fixed page sizes', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: fixedPageSizeItemList }));

      renderFinder({
        ...baseProps,
        fixedPageSize: 10,
        savedObjectMetaData: searchMetaData,
        services: { uiSettings, contentClient, savedObjectsTagging },
      });

      await waitForItemsLoaded('Title 00');

      expect(screen.queryByText(/Rows per page/)).not.toBeInTheDocument();
      expect(getTitleLinkTexts()).toHaveLength(10);
    });

    it('should switch page correctly for fixed page sizes', async () => {
      mockSearch.mockImplementation(() => Promise.resolve({ hits: fixedPageSizeItemList }));

      const user = userEvent.setup();

      renderFinder({
        ...baseProps,
        fixedPageSize: 10,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded('Title 00');
      expect(getTitleLinkTexts()).toHaveLength(10);

      await user.click(screen.getByTestId('pagination-button-next'));

      await waitFor(() => {
        expect(getTitleLinkTexts()).toHaveLength(5);
      });
    });
  });

  describe('loading state', () => {
    it('should display a loading indicator during initial loading', () => {
      mockSearch.mockImplementation(() => new Promise(() => {}));

      const { container } = renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      expect(container.querySelectorAll('.euiBasicTable-loading')).toHaveLength(1);
    });

    it('should hide the loading indicator if data is shown', async () => {
      mockSearch.mockResolvedValue({ hits: [doc] });

      const { container } = renderFinder({
        ...baseProps,
        savedObjectMetaData: [
          {
            getIconForSavedObject: () => 'search',
            name: 'Search',
            type: 'search',
          },
        ],
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitFor(() => {
        expect(screen.getByText(doc.attributes.title)).toBeInTheDocument();
      });
      expect(container.querySelectorAll('.euiBasicTable-loading')).toHaveLength(0);
    });

    it('should show the loading indicator if there are already items and the search is updated', async () => {
      mockSearch
        .mockResolvedValueOnce({ hits: [doc] })
        .mockImplementation(() => new Promise(() => {}));

      const { container } = renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitFor(() => {
        expect(screen.getByText(doc.attributes.title)).toBeVisible();
      });
      expect(container.querySelectorAll('.euiBasicTable-loading')).toHaveLength(0);

      await typeSearchQuery('abc');

      expect(container.querySelectorAll('.euiBasicTable-loading')).toHaveLength(1);
    });
  });

  it('should render with children', async () => {
    mockSearch.mockImplementation(() => new Promise(() => {}));

    renderFinder({
      ...baseProps,
      children: <button>Dummy text</button>,
      savedObjectMetaData: [
        {
          getIconForSavedObject: () => 'search',
          name: 'Search',
          type: 'search',
        },
        {
          getIconForSavedObject: () => 'chartLine',
          name: 'Vis',
          type: 'vis',
        },
      ],
      services: { contentClient, savedObjectsTagging, uiSettings },
    });

    expect(screen.getByText('Dummy text')).toBeVisible();
  });

  describe('columns', () => {
    it('should show all columns', async () => {
      mockSearch.mockResolvedValue({
        hits: [doc],
      });

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();

      const table = within(getResultsTable());
      expect(table.getAllByRole('columnheader')).toHaveLength(3);
      expect(table.getByRole('columnheader', { name: /Type/ })).toBeVisible();
      expect(table.getByRole('columnheader', { name: /Title/ })).toBeVisible();
      expect(table.getByRole('columnheader', { name: /Tags/ })).toBeVisible();
    });

    it('should hide the type column if there is only one type in the metadata list', async () => {
      mockSearch.mockResolvedValue({
        hits: [doc],
      });

      renderFinder({
        ...baseProps,
        savedObjectMetaData: searchMetaData,
        services: { contentClient, savedObjectsTagging, uiSettings },
      });

      await waitForItemsLoaded();

      const table = within(getResultsTable());
      expect(table.getAllByRole('columnheader')).toHaveLength(2);
      expect(table.queryByRole('columnheader', { name: /Type/ })).not.toBeInTheDocument();
      expect(table.getByRole('columnheader', { name: /Title/ })).toBeVisible();
      expect(table.getByRole('columnheader', { name: /Tags/ })).toBeVisible();
    });

    it('should hide the tags column if savedObjectsTagging is undefined', async () => {
      mockSearch.mockResolvedValue({
        hits: [doc],
      });

      renderFinder({
        ...baseProps,
        savedObjectMetaData: metaDataConfig,
        services: { contentClient, savedObjectsTagging: undefined, uiSettings },
      });

      await waitForItemsLoaded();

      const table = within(getResultsTable());
      expect(table.getAllByRole('columnheader')).toHaveLength(2);
      expect(table.getByRole('columnheader', { name: /Type/ })).toBeVisible();
      expect(table.getByRole('columnheader', { name: /Title/ })).toBeVisible();
      expect(table.queryByRole('columnheader', { name: /Tags/ })).not.toBeInTheDocument();
    });
  });

  it('should add a tooltip when text is provided', async () => {
    mockSearch.mockResolvedValue({
      hits: [doc, doc2, doc3],
    });

    const tooltipText = 'This is a tooltip';
    const user = userEvent.setup();

    renderFinder({
      ...baseProps,
      getTooltipText: (item) => (item.id === doc3.id ? tooltipText : undefined),
      savedObjectMetaData: metaDataConfig,
      services: { contentClient, savedObjectsTagging, uiSettings },
    });

    const getTitleLink = (title: string) => screen.getByRole('button', { name: title });

    const assertTooltip = async (title: string, show: boolean) => {
      await user.hover(getTitleLink(title));

      const tooltip = screen.queryByText(tooltipText);
      if (show) {
        expect(tooltip).toBeVisible();
      } else {
        expect(tooltip).not.toBeInTheDocument();
      }
    };

    await waitForItemsLoaded();

    await assertTooltip(doc.attributes.title, false);
    await assertTooltip(doc3.attributes.title, true);
  });

  it('should focus the search input on render', async () => {
    mockSearch.mockResolvedValue({ hits: [doc] });

    renderFinder({
      ...baseProps,
      savedObjectMetaData: searchMetaData,
      services: { contentClient, savedObjectsTagging, uiSettings },
    });

    const input = await screen.findByRole('searchbox');
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });
});
