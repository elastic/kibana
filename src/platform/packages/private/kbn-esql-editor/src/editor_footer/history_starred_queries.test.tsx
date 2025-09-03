/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  QueryHistoryAction,
  getTableColumns,
  QueryColumn,
  HistoryAndStarredQueriesTabs,
} from './history_starred_queries';
import { of } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { getHistoryItems, getStorageStats } from '../history_local_storage';

jest.mock('../history_local_storage', () => ({
  getHistoryItems: jest.fn(),
  getStorageStats: jest.fn(() => ({ queryCount: 0, storageSizeKB: 0 })),
  dateFormat: 'MMM. DD, YY HH:mm:ss',
}));

const mockGetHistoryItems = getHistoryItems as jest.MockedFunction<typeof getHistoryItems>;
const mockGetStorageStats = getStorageStats as jest.MockedFunction<typeof getStorageStats>;

const mockHistoryItems = [
  {
    queryString: 'FROM logs | WHERE status = "error"',
    timeRan: '',
    status: 'success' as const,
  },
  {
    queryString: 'FROM metrics | STATS count()',
    timeRan: '',
    status: 'success' as const,
  },
  {
    queryString: 'FROM traces | WHERE duration > 1000',
    timeRan: '',
    status: 'error' as const,
  },
];

describe('Starred and History queries components', () => {
  const services = {
    core: coreMock.createStart(),
    usageCollection: {},
    storage: {},
  };

  beforeEach(() => {
    mockGetHistoryItems.mockReturnValue(mockHistoryItems);
    mockGetStorageStats.mockReturnValue({
      queryCount: 3,
      storageSizeKB: 1,
      maxStorageLimitKB: 5,
      storageUsagePercent: 0,
    });
  });

  describe('QueryHistoryAction', () => {
    it('should render the history action component as a button if is spaceReduced is undefined', () => {
      render(<QueryHistoryAction toggleHistory={jest.fn()} isHistoryOpen />);
      expect(
        screen.getByTestId('ESQLEditor-toggle-query-history-button-container')
      ).toBeInTheDocument();

      expect(
        screen.getByTestId('ESQLEditor-toggle-query-history-button-container')
      ).toHaveTextContent('Hide recent queries');
    });

    it('should render the history action component as an icon if is spaceReduced is true', () => {
      render(<QueryHistoryAction toggleHistory={jest.fn()} isHistoryOpen isSpaceReduced />);
      expect(screen.getByTestId('ESQLEditor-toggle-query-history-icon')).toBeInTheDocument();
    });
  });

  describe('getTableColumns', () => {
    it('should get the table columns correctly', async () => {
      const columns = getTableColumns(50, false, []);
      expect(columns).toEqual([
        {
          'data-test-subj': 'favoriteBtn',
          render: expect.anything(),
          width: '40px',
        },
        {
          css: {
            height: '100%',
          },
          'data-test-subj': 'status',
          field: 'status',
          name: '',
          render: expect.anything(),
          sortable: false,
          width: '40px',
        },
        {
          'data-test-subj': 'queryString',
          field: 'queryString',
          name: 'Query',
          render: expect.anything(),
          css: expect.anything(),
        },
        {
          'data-test-subj': 'timeRan',
          field: 'timeRan',
          name: 'Time ran',
          render: expect.anything(),
          sortable: true,
          width: '240px',
        },
        {
          actions: [],
          'data-test-subj': 'actions',
          name: '',
          width: '60px',
        },
      ]);
    });

    it('should get the table columns correctly for the starred list', async () => {
      const columns = getTableColumns(50, false, [], true);
      expect(columns).toEqual([
        {
          'data-test-subj': 'favoriteBtn',
          render: expect.anything(),
          width: '40px',
        },
        {
          css: {
            height: '100%',
          },
          'data-test-subj': 'status',
          field: 'status',
          name: '',
          render: expect.anything(),
          sortable: false,
          width: '40px',
        },
        {
          'data-test-subj': 'queryString',
          field: 'queryString',
          name: 'Query',
          render: expect.anything(),
          css: expect.anything(),
        },
        {
          'data-test-subj': 'timeRan',
          field: 'timeRan',
          name: 'Date Added',
          render: expect.anything(),
          sortable: true,
          width: '240px',
        },
        {
          actions: [],
          'data-test-subj': 'actions',
          name: '',
          width: '60px',
        },
      ]);
    });
  });

  it('should get the history table columns correctly for reduced space', async () => {
    const columns = getTableColumns(50, true, []);
    expect(columns).toEqual([
      {
        'data-test-subj': 'favoriteBtn',
        render: expect.anything(),
        width: 'auto',
      },
      {
        css: {
          height: '100%',
        },
        'data-test-subj': 'status',
        field: 'status',
        name: '',
        render: expect.anything(),
        sortable: false,
        width: 'auto',
      },
      {
        'data-test-subj': 'timeRan',
        field: 'timeRan',
        name: 'Time ran',
        render: expect.anything(),
        sortable: true,
        width: 'auto',
      },
      {
        'data-test-subj': 'queryString',
        field: 'queryString',
        name: 'Query',
        render: expect.anything(),
        css: expect.anything(),
      },
      {
        actions: [],
        'data-test-subj': 'actions',
        name: '',
        width: 'auto',
      },
    ]);
  });

  describe('Querystring column', () => {
    it('should not render the expanded button for large viewports', async () => {
      render(
        <QueryColumn
          containerWidth={900}
          queryString={' from index | stats woof = avg(meow) by meow'}
          isOnReducedSpaceLayout={false}
        />
      );
      expect(
        screen.queryByTestId('ESQLEditor-queryList-queryString-expanded')
      ).not.toBeInTheDocument();
    });

    it('should render the expanded button for small viewports', async () => {
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        value: 400,
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        value: 200,
      });
      render(
        <QueryColumn
          containerWidth={40}
          queryString={' from index | stats woof = avg(meow) by meow'}
          isOnReducedSpaceLayout={true}
        />
      );
      expect(screen.getByTestId('ESQLEditor-queryList-queryString-expanded')).toBeInTheDocument();
    });
  });

  describe('HistoryAndStarredQueriesTabs', () => {
    it('should render two tabs', () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={1024}
            onUpdateAndSubmit={jest.fn()}
            height={200}
          />
        </KibanaContextProvider>
      );
      expect(screen.getByTestId('history-queries-tab')).toBeInTheDocument();
      expect(screen.getByTestId('history-queries-tab')).toHaveTextContent('Recent');
      expect(screen.getByTestId('starred-queries-tab')).toBeInTheDocument();
      expect(screen.getByTestId('starred-queries-tab')).toHaveTextContent('Starred');
    });

    it('should render the history queries tab by default', () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={1024}
            onUpdateAndSubmit={jest.fn()}
            height={200}
          />
        </KibanaContextProvider>
      );
      expect(screen.getByTestId('ESQLEditor-queryHistory')).toBeInTheDocument();
      expect(screen.getByTestId('ESQLEditor-history-starred-queries-helpText')).toHaveTextContent(
        'Showing 3 queries'
      );
    });

    it('should not render the history queries help text for small sized', () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={1024}
            isSpaceReduced={true}
            onUpdateAndSubmit={jest.fn()}
            height={200}
          />
        </KibanaContextProvider>
      );
      expect(screen.getByTestId('ESQLEditor-queryHistory')).toBeInTheDocument();
      expect(
        screen.queryByTestId('ESQLEditor-history-starred-queries-helpText')
      ).not.toBeInTheDocument();
    });

    it('should render the starred queries if the corresponding btn is clicked', () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={1024}
            onUpdateAndSubmit={jest.fn()}
            height={200}
          />
        </KibanaContextProvider>
      );
      // click the starred queries tab
      act(() => {
        screen.getByTestId('starred-queries-tab').click();
      });

      expect(screen.getByTestId('ESQLEditor-starredQueries')).toBeInTheDocument();
      expect(screen.getByTestId('ESQLEditor-history-starred-queries-helpText')).toHaveTextContent(
        'Showing 0 queries (max 100)'
      );
    });

    it('should hide starred tab if starred service failed to initialize', async () => {
      jest.spyOn(services.core.userProfile, 'getEnabled$').mockImplementation(() => of(false));

      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={1024}
            onUpdateAndSubmit={jest.fn()}
            height={200}
          />
        </KibanaContextProvider>
      );

      // initial render two tabs are shown
      expect(screen.getByTestId('history-queries-tab')).toBeInTheDocument();
      expect(screen.getByTestId('history-queries-tab')).toHaveTextContent('Recent');
      expect(screen.getByTestId('starred-queries-tab')).toBeInTheDocument();
      expect(screen.getByTestId('starred-queries-tab')).toHaveTextContent('Starred');

      await waitFor(() => {
        expect(screen.queryByText('starred-queries-tab')).not.toBeInTheDocument();
      });
    });

    it('should render search input only in Recent tab', async () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={800}
            onUpdateAndSubmit={jest.fn()}
            height={400}
          />
        </KibanaContextProvider>
      );

      // Search input should be visible in Recent tab by default
      expect(screen.getByTestId('ESQLEditor-history-search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search query history')).toBeInTheDocument();
    });

    it('should filter history items based on search query', async () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={800}
            onUpdateAndSubmit={jest.fn()}
            height={400}
          />
        </KibanaContextProvider>
      );

      const searchInput = screen.getByTestId('ESQLEditor-history-search');

      // Initially all items should be visible
      await waitFor(() => {
        expect(screen.getByText('FROM logs | WHERE status = "error"')).toBeInTheDocument();
        expect(screen.getByText('FROM metrics | STATS count()')).toBeInTheDocument();
        expect(screen.getByText('FROM traces | WHERE duration > 1000')).toBeInTheDocument();
      });

      // Filter by "logs"
      fireEvent.change(searchInput, { target: { value: 'logs' } });

      await waitFor(() => {
        expect(screen.getByText('FROM logs | WHERE status = "error"')).toBeInTheDocument();
        expect(screen.queryByText('FROM metrics | STATS count()')).not.toBeInTheDocument();
        expect(screen.queryByText('FROM traces | WHERE duration > 1000')).not.toBeInTheDocument();
      });

      // Filter by "STATS"
      fireEvent.change(searchInput, { target: { value: 'STATS' } });

      await waitFor(() => {
        expect(screen.queryByText('FROM logs | WHERE status = "error"')).not.toBeInTheDocument();
        expect(screen.getByText('FROM metrics | STATS count()')).toBeInTheDocument();
        expect(screen.queryByText('FROM traces | WHERE duration > 1000')).not.toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('FROM logs | WHERE status = "error"')).toBeInTheDocument();
        expect(screen.getByText('FROM metrics | STATS count()')).toBeInTheDocument();
        expect(screen.getByText('FROM traces | WHERE duration > 1000')).toBeInTheDocument();
      });
    });

    it('should be case insensitive when filtering', async () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={800}
            onUpdateAndSubmit={jest.fn()}
            height={400}
          />
        </KibanaContextProvider>
      );

      const searchInput = screen.getByTestId('ESQLEditor-history-search');

      // Search with lowercase
      fireEvent.change(searchInput, { target: { value: 'from' } });

      await waitFor(() => {
        // All items should match since they all contain "FROM"
        expect(screen.getByText('FROM logs | WHERE status = "error"')).toBeInTheDocument();
        expect(screen.getByText('FROM metrics | STATS count()')).toBeInTheDocument();
        expect(screen.getByText('FROM traces | WHERE duration > 1000')).toBeInTheDocument();
      });

      // Search with mixed case
      fireEvent.change(searchInput, { target: { value: 'WhErE' } });

      await waitFor(() => {
        expect(screen.getByText('FROM logs | WHERE status = "error"')).toBeInTheDocument();
        expect(screen.queryByText('FROM metrics | STATS count()')).not.toBeInTheDocument();
        expect(screen.getByText('FROM traces | WHERE duration > 1000')).toBeInTheDocument();
      });
    });

    it('should update help text with filtered count when searching', async () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={800}
            onUpdateAndSubmit={jest.fn()}
            height={400}
          />
        </KibanaContextProvider>
      );

      const searchInput = screen.getByTestId('ESQLEditor-history-search');

      // Initially shows total count
      expect(screen.getByTestId('ESQLEditor-history-starred-queries-helpText')).toHaveTextContent(
        'Showing 3 queries'
      );

      // Filter to show only 1 result
      fireEvent.change(searchInput, { target: { value: 'logs' } });

      await waitFor(() => {
        expect(screen.getByTestId('ESQLEditor-history-starred-queries-helpText')).toHaveTextContent(
          'Showing 1 queries'
        );
      });
    });

    it('should render search input for starred tab when selected', async () => {
      render(
        <KibanaContextProvider services={services}>
          <HistoryAndStarredQueriesTabs
            containerCSS={{}}
            containerWidth={800}
            onUpdateAndSubmit={jest.fn()}
            height={400}
          />
        </KibanaContextProvider>
      );

      // Switch to starred tab
      act(() => {
        screen.getByTestId('starred-queries-tab').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ESQLEditor-starred-search')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search starred queries')).toBeInTheDocument();
        expect(screen.queryByTestId('ESQLEditor-history-search')).not.toBeInTheDocument();
      });
    });
  });
});
