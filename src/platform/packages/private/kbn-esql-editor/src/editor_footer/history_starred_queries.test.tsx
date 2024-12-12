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
import { render, screen } from '@testing-library/react';
import {
  QueryHistoryAction,
  getTableColumns,
  QueryColumn,
  HistoryAndStarredQueriesTabs,
} from './history_starred_queries';

jest.mock('../history_local_storage', () => {
  const module = jest.requireActual('../history_local_storage');
  return {
    ...module,
    getHistoryItems: () => [
      {
        queryString: 'from kibana_sample_data_flights | limit 10',
        timeRan: 'Mar. 25, 24 08:45:27',
        queryRunning: false,
        status: 'success',
      },
    ],
  };
});

describe('Starred and History queries components', () => {
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
    const services = {
      core: coreMock.createStart(),
    };
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
        'Showing last 20 queries'
      );
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
      screen.getByTestId('starred-queries-tab').click();

      expect(screen.getByTestId('ESQLEditor-starredQueries')).toBeInTheDocument();
      expect(screen.getByTestId('ESQLEditor-history-starred-queries-helpText')).toHaveTextContent(
        'Showing 0 queries (max 100)'
      );
    });
  });
});
