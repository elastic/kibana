/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { LogExplorerTabs, LogExplorerTabsProps } from './log_explorer_tabs';
import { DISCOVER_APP_LOCATOR } from '../../../common';
import { ALL_DATASETS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { of } from 'rxjs';
import { omit } from 'lodash';

const getRedirectUrl = (id: string, params: Record<string, unknown>) =>
  `${id}-${Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join(',')}`;

const createMockLocator = (id: string) => ({
  navigate: jest.fn(),
  getRedirectUrl: jest.fn((params) => getRedirectUrl(id, params)),
});

describe('LogExplorerTabs', () => {
  const renderTabs = (selectedTab: LogExplorerTabsProps['selectedTab'] = 'discover') => {
    const mockDiscoverLocator = createMockLocator(DISCOVER_APP_LOCATOR);
    const mockLogExplorerLocator = createMockLocator(ALL_DATASETS_LOCATOR_ID);
    const queryState = {
      time: {
        from: 'now-15m',
        to: 'now',
      },
      refreshInterval: {
        pause: true,
        value: 0,
      },
      query: {
        language: 'kuery',
        query: '',
      },
      filters: [],
    };
    const services = {
      ...discoverServiceMock,
      data: {
        ...discoverServiceMock.data,
        query: {
          ...discoverServiceMock.data.query,
          state$: of({ state: queryState }),
          getState: jest.fn(() => queryState),
        },
      },
      share: {
        ...discoverServiceMock.share,
        url: {
          ...discoverServiceMock.share?.url,
          locators: {
            get: jest.fn((id) => {
              switch (id) {
                case DISCOVER_APP_LOCATOR:
                  return mockDiscoverLocator;
                case ALL_DATASETS_LOCATOR_ID:
                  return mockLogExplorerLocator;
                default:
                  throw new Error(`Unknown locator id: ${id}`);
              }
            }),
          },
        },
      },
    } as unknown as typeof discoverServiceMock;
    const params = {
      columns: ['@timestamp'],
      sort: [['@timestamp', 'desc']],
      dataViewSpec: {
        id: 'test',
        title: 'test',
        timeFieldName: '@timestamp',
      },
    };
    const adjustedQuery = { ...omit(queryState, 'time'), timeRange: queryState.time };
    const combinedParams = { ...params, ...adjustedQuery };

    render(<LogExplorerTabs services={services} params={params} selectedTab={selectedTab} />);

    return {
      params: combinedParams,
      queryState,
      mockDiscoverLocator,
      mockLogExplorerLocator,
    };
  };

  const getDiscoverTab = () => screen.getByText('Discover').closest('a')!;
  const getLogExplorerTab = () => screen.getByText('Logs Explorer').closest('a')!;

  it('should render properly', () => {
    const { /* params, */ mockDiscoverLocator, mockLogExplorerLocator } = renderTabs();
    expect(getDiscoverTab()).toBeInTheDocument();
    // expect(mockDiscoverLocator.getRedirectUrl).toHaveBeenCalledWith(params);
    expect(mockDiscoverLocator.getRedirectUrl).toHaveBeenCalledWith({});
    // expect(getDiscoverTab()).toHaveAttribute('href', getRedirectUrl(DISCOVER_APP_LOCATOR, params));
    expect(getDiscoverTab()).toHaveAttribute('href', getRedirectUrl(DISCOVER_APP_LOCATOR, {}));
    expect(getLogExplorerTab()).toBeInTheDocument();
    // expect(mockLogExplorerLocator.getRedirectUrl).toHaveBeenCalledWith(params);
    expect(mockLogExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({});
    // expect(getLogExplorerTab()).toHaveAttribute(
    //   'href',
    //   getRedirectUrl(ALL_DATASETS_LOCATOR_ID, params)
    // );
    expect(getLogExplorerTab()).toHaveAttribute(
      'href',
      getRedirectUrl(ALL_DATASETS_LOCATOR_ID, {})
    );
  });

  it('should render Discover as the selected tab', () => {
    const { /* params, */ mockDiscoverLocator, mockLogExplorerLocator } = renderTabs();
    expect(getDiscoverTab()).toHaveAttribute('aria-selected', 'true');
    userEvent.click(getDiscoverTab());
    expect(mockDiscoverLocator.navigate).not.toHaveBeenCalled();
    expect(getLogExplorerTab()).toHaveAttribute('aria-selected', 'false');
    userEvent.click(getLogExplorerTab());
    // expect(mockLogExplorerLocator.navigate).toHaveBeenCalledWith(params);
    expect(mockLogExplorerLocator.navigate).toHaveBeenCalledWith({});
  });

  it('should render Log Explorer as the selected tab', () => {
    const { /* params, */ mockDiscoverLocator, mockLogExplorerLocator } =
      renderTabs('log-explorer');
    expect(getLogExplorerTab()).toHaveAttribute('aria-selected', 'true');
    userEvent.click(getLogExplorerTab());
    expect(mockLogExplorerLocator.navigate).not.toHaveBeenCalled();
    expect(getDiscoverTab()).toHaveAttribute('aria-selected', 'false');
    userEvent.click(getDiscoverTab());
    // expect(mockDiscoverLocator.navigate).toHaveBeenCalledWith(params);
    expect(mockDiscoverLocator.navigate).toHaveBeenCalledWith({});
  });
});
