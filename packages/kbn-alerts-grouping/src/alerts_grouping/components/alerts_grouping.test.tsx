/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Adapted from x-pack/plugins/security_solution/public/detections/components/alerts_table/alerts_grouping.test.tsx
 */
import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';

import { AlertsGroupingProps } from '../types';
import { AlertsGrouping } from './alerts_grouping';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { useFindAlertsQuery } from '@kbn/alerts-ui-shared';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { getQuery, groupingSearchResponse } from '../mocks/grouping_query.mock';
import { useAlertsGroupingState } from '../contexts/alerts_grouping_context';
import { I18nProvider } from '@kbn/i18n-react';

const localStorageMock = () => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
});

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_find_alerts_query', () => ({
  useFindAlertsQuery: jest.fn(),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alert_data_view', () => ({
  useAlertDataView: jest.fn().mockReturnValue({ dataViews: [{ fields: [] }] }),
}));

jest.mock('../contexts/alerts_grouping_context', () => {
  const original = jest.requireActual('../contexts/alerts_grouping_context');
  return {
    ...original,
    useAlertsGroupingState: jest.fn(),
  };
});

const mockUseAlertsGroupingState = useAlertsGroupingState as jest.Mock;

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

const mockUseFindAlertsQuery = useFindAlertsQuery as jest.Mock;

const mockOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const renderChildComponent = (groupingFilters: Filter[]) => <p data-test-subj="alerts-table" />;

const groupingId = 'test';

const featureIds = [AlertConsumers.STACK_ALERTS];

const mockDate = {
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
};

const testProps: Omit<AlertsGroupingProps, 'children'> = {
  ...mockDate,
  defaultGroupingOptions: mockOptions,
  featureIds,
  getAggregationsByGroupingField: () => [],
  getGroupStats: () => [{ title: 'Stat', component: <span /> }],
  renderGroupPanel: () => <span />,
  takeActionItems: undefined,
  defaultFilters: [],
  globalFilters: [],
  globalQuery: {
    query: 'query',
    language: 'language',
  },
  loading: false,
  groupingId,
  services: {
    dataViews: {
      clearInstanceCache: jest.fn(),
      create: jest.fn(),
    } as unknown as AlertsGroupingProps['services']['dataViews'],
    http: {
      get: jest.fn(),
    } as unknown as AlertsGroupingProps['services']['http'],
    notifications: {
      toasts: {
        addDanger: jest.fn(),
      },
    } as unknown as AlertsGroupingProps['services']['notifications'],
    storage: {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as AlertsGroupingProps['services']['storage'],
  },
};

const getMockStorageState = (groups: string[] = ['none']) =>
  JSON.stringify({
    [groupingId]: {
      activeGroups: groups,
      options: mockOptions,
    },
  });

const mockQueryResponse = {
  loading: false,
  data: {
    aggregations: {
      groupsCount: {
        value: 0,
      },
    },
  },
};

const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

const mockAlertsGroupingState = {
  grouping: {
    options: mockOptions,
    activeGroups: ['kibana.alert.rule.name'],
  },
  updateGrouping: jest.fn(),
};

describe('AlertsGrouping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFindAlertsQuery.mockImplementation(() => ({
      loading: false,
      data: groupingSearchResponse,
    }));
    mockUseAlertsGroupingState.mockReturnValue(mockAlertsGroupingState);
  });

  it('renders empty grouping table when group is selected without data', () => {
    mockUseFindAlertsQuery.mockReturnValue(mockQueryResponse);
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name']));

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );
    expect(queryByTestId('alerts-table')).not.toBeInTheDocument();
    expect(getByTestId('empty-results-panel')).toBeInTheDocument();
  });

  it('renders grouping table in first accordion level when single group is selected', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );

    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    expect(within(getByTestId('level-0-group-0')).getByTestId('alerts-table')).toBeInTheDocument();
  });

  it('Query gets passed correctly', () => {
    render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );
    expect(mockUseFindAlertsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: getQuery({
          selectedGroup: 'kibana.alert.rule.name',
          uniqueValue: 'SuperUniqueValue-test-uuid',
          timeRange: mockDate,
          featureIds,
        }),
      })
    );
  });

  it('renders grouping table in second accordion level when 2 groups are selected', () => {
    mockUseAlertsGroupingState.mockReturnValue({
      ...mockAlertsGroupingState,
      grouping: {
        ...mockAlertsGroupingState.grouping,
        activeGroups: ['kibana.alert.rule.name', 'user.name'],
      },
    });
    const { getByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    expect(
      within(getByTestId('level-0-group-0')).queryByTestId('alerts-table')
    ).not.toBeInTheDocument();
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));
    expect(within(getByTestId('level-1-group-0')).getByTestId('alerts-table')).toBeInTheDocument();
  });

  it('resets all levels pagination when selected group changes', () => {
    mockUseAlertsGroupingState.mockReturnValue({
      ...mockAlertsGroupingState,
      grouping: {
        ...mockAlertsGroupingState.grouping,
        activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
      },
    });
    const { getByTestId, getAllByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual(null);
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual('true');
    });

    fireEvent.click(getAllByTestId('group-selector-dropdown')[0]);
    fireEvent.click(getAllByTestId('panel-user.name')[0]);

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      // level 2 has been removed with the group selection change
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual('true');
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual(null);
    });
  });

  it('resets all levels pagination when global query updates', () => {
    mockUseAlertsGroupingState.mockReturnValue({
      ...mockAlertsGroupingState,
      grouping: {
        ...mockAlertsGroupingState.grouping,
        activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
      },
    });

    const { getByTestId, rerender } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));

    rerender(
      <TestProviders>
        <AlertsGrouping
          {...{ ...testProps, globalQuery: { query: 'updated', language: 'language' } }}
        >
          {renderChildComponent}
        </AlertsGrouping>
      </TestProviders>
    );

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual('true');
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual(null);
    });
  });

  it('resets only most inner group pagination when its parent groups open/close', () => {
    mockUseAlertsGroupingState.mockReturnValue({
      ...mockAlertsGroupingState,
      grouping: {
        ...mockAlertsGroupingState.grouping,
        activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );

    // set level 0 page to 2
    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));

    // set level 1 page to 2
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    // set level 2 page to 2
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-2-group-0')).getByTestId('group-panel-toggle'));

    // open different level 1 group

    // level 0, 1 pagination is the same
    fireEvent.click(within(getByTestId('level-1-group-1')).getByTestId('group-panel-toggle'));
    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual(null);
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual('true');
    });

    // level 2 pagination is reset
    expect(
      within(getByTestId('grouping-level-2-pagination'))
        .getByTestId('pagination-button-0')
        .getAttribute('aria-current')
    ).toEqual('true');
    expect(
      within(getByTestId('grouping-level-2-pagination'))
        .getByTestId('pagination-button-1')
        .getAttribute('aria-current')
    ).toEqual(null);
  });

  it(`resets innermost level's current page when that level's page size updates`, () => {
    mockUseAlertsGroupingState.mockReturnValue({
      ...mockAlertsGroupingState,
      grouping: {
        ...mockAlertsGroupingState.grouping,
        activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(
      within(getByTestId('grouping-level-2')).getByTestId('tablePaginationPopoverButton')
    );
    fireEvent.click(getByTestId('tablePagination-100-rows'));
    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination, i) => {
      if (i !== 2) {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual(null);
        expect(
          within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
        ).toEqual('true');
      } else {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual('true');
        expect(within(pagination).queryByTestId('pagination-button-1')).not.toBeInTheDocument();
      }
    });
  });

  it(`resets outermost level's current page when that level's page size updates`, () => {
    mockUseAlertsGroupingState.mockReturnValue({
      ...mockAlertsGroupingState,
      grouping: {
        ...mockAlertsGroupingState.grouping,
        activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
      },
    });

    const { getByTestId, getAllByTestId } = render(
      <TestProviders>
        <AlertsGrouping {...testProps}>{renderChildComponent}</AlertsGrouping>
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));
    const tablePaginations = getAllByTestId('tablePaginationPopoverButton');
    fireEvent.click(tablePaginations[tablePaginations.length - 1]);
    fireEvent.click(getByTestId('tablePagination-100-rows'));

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination, i) => {
      if (i !== 0) {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual(null);
        expect(
          within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
        ).toEqual('true');
      } else {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual('true');
        expect(within(pagination).queryByTestId('pagination-button-1')).not.toBeInTheDocument();
      }
    });
  });
});
