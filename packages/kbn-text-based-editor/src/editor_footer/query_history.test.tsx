/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { QueryHistoryAction, getTableColumns, QueryColumn } from './query_history';
import { render, screen } from '@testing-library/react';

jest.mock('../history_local_storage', () => {
  const module = jest.requireActual('../history_local_storage');
  return {
    ...module,
    getHistoryItems: () => [
      {
        queryString: 'from kibana_sample_data_flights | limit 10',
        timeZone: 'Browser',
        timeRan: 'Mar. 25, 24 08:45:27',
        queryRunning: false,
        status: 'success',
      },
    ],
  };
});

describe('QueryHistory', () => {
  describe('QueryHistoryAction', () => {
    it('should render the history action component as a button if is spaceReduced is undefined', () => {
      render(<QueryHistoryAction toggleHistory={jest.fn()} isHistoryOpen />);
      expect(
        screen.getByTestId('TextBasedLangEditor-toggle-query-history-button-container')
      ).toBeInTheDocument();

      expect(
        screen.getByTestId('TextBasedLangEditor-toggle-query-history-button-container')
      ).toHaveTextContent('Hide recent queries');
    });

    it('should render the history action component as an icon if is spaceReduced is true', () => {
      render(<QueryHistoryAction toggleHistory={jest.fn()} isHistoryOpen isSpaceReduced />);
      expect(
        screen.getByTestId('TextBasedLangEditor-toggle-query-history-icon')
      ).toBeInTheDocument();
    });
  });

  describe('getTableColumns', () => {
    it('should get the history table columns correctly', async () => {
      const columns = getTableColumns(50, false, []);
      expect(columns).toEqual([
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
          name: 'Recent queries',
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
  });

  it('should get the history table columns correctly for reduced space', async () => {
    const columns = getTableColumns(50, true, []);
    expect(columns).toEqual([
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
        name: 'Recent queries',
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
        screen.queryByTestId('TextBasedLangEditor-queryHistory-queryString-expanded')
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
      expect(
        screen.getByTestId('TextBasedLangEditor-queryHistory-queryString-expanded')
      ).toBeInTheDocument();
    });
  });
});
