/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { QueryHistoryAction, getTableColumns, QueryHistory, QueryColumn } from './query_history';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';

jest.mock('./history_local_storage', () => {
  const module = jest.requireActual('./history_local_storage');
  return {
    ...module,
    getHistoryItems: () => [
      {
        queryString: 'from kibana_sample_data_flights | limit 10',
        timeZone: 'Browser',
        timeRan: 'Mar. 25, 24 08:45:27',
        queryRunning: false,
        duration: '2ms',
        status: 'success',
      },
    ],
  };
});

describe('QueryHistory', () => {
  describe('QueryHistoryAction', () => {
    it('should render the history action component as a button if is spaceReduced is undefined', async () => {
      const component = mount(<QueryHistoryAction toggleHistory={jest.fn()} isHistoryOpen />);
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-toggle-query-history-button"]').length
      ).not.toBe(0);

      expect(
        component
          .find('[data-test-subj="TextBasedLangEditor-toggle-query-history-button"]')
          .at(0)
          .text()
      ).toBe('Hide recent queries');
    });

    it('should render the history action component as an icon if is spaceReduced is true', async () => {
      const component = mount(
        <QueryHistoryAction toggleHistory={jest.fn()} isHistoryOpen isSpaceReduced />
      );
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-toggle-query-history-icon"]').length
      ).not.toBe(0);
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
          'data-test-subj': 'lastDuration',
          field: 'duration',
          name: 'Last duration',
          sortable: false,
          width: '120px',
        },
        {
          actions: [],
          'data-test-subj': 'actions',
          name: '',
          width: '40px',
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
        'data-test-subj': 'lastDuration',
        field: 'duration',
        name: 'Last duration',
        sortable: false,
        width: 'auto',
      },
      {
        actions: [],
        'data-test-subj': 'actions',
        name: '',
        width: 'auto',
      },
    ]);
  });

  describe('QueryHistory component', () => {
    it('should not fetch the query items if refetchHistoryItems is not given', async () => {
      const component = mount(
        <QueryHistory onUpdateAndSubmit={jest.fn()} containerWidth={400} containerCSS={''} />
      );
      expect(component.find(EuiInMemoryTable).prop('items')).toEqual([]);
    });

    it('should fetch the query items if refetchHistoryItems is given ', async () => {
      const component = mount(
        <QueryHistory
          onUpdateAndSubmit={jest.fn()}
          containerWidth={400}
          containerCSS={''}
          refetchHistoryItems
        />
      );
      expect(component.find(EuiInMemoryTable).prop('items')).toEqual([
        {
          queryString: 'from kibana_sample_data_flights | limit 10',
          timeZone: 'Browser',
          timeRan: 'Mar. 25, 24 08:45:27',
          queryRunning: false,
          duration: '2ms',
          status: 'success',
        },
      ]);
    });

    it('should have an auto layout for small viewports', async () => {
      const component = mount(
        <QueryHistory
          onUpdateAndSubmit={jest.fn()}
          containerWidth={400}
          containerCSS={''}
          refetchHistoryItems
        />
      );
      expect(component.find(EuiInMemoryTable).prop('tableLayout')).toEqual('auto');
    });

    it('should have a fixed layout for large viewports', async () => {
      const component = mount(
        <QueryHistory
          onUpdateAndSubmit={jest.fn()}
          containerWidth={900}
          containerCSS={''}
          refetchHistoryItems
        />
      );
      expect(component.find(EuiInMemoryTable).prop('tableLayout')).toEqual('fixed');
    });
  });

  describe('Querystring column', () => {
    it('should not render the expanded button for large viewports', async () => {
      const component = mount(
        <QueryColumn
          containerWidth={900}
          queryString={' from index | stats woof = avg(meow) by meow'}
          isOnReducedSpaceLayout={false}
        />
      );
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-queryHistory-queryString-expanded"]')
          .length
      ).toBe(0);
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
      const component = mount(
        <QueryColumn
          containerWidth={40}
          queryString={' from index | stats woof = avg(meow) by meow'}
          isOnReducedSpaceLayout={true}
        />
      );
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-queryHistory-queryString-expanded"]')
          .length
      ).not.toBe(0);
    });
  });
});
