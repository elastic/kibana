/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { LogsExplorerTabs, LogsExplorerTabsProps } from './logs_explorer_tabs';
import { DISCOVER_APP_LOCATOR } from '../../../common';
import { ALL_DATASETS_LOCATOR_ID } from '@kbn/deeplinks-observability';

const createMockLocator = (id: string) => ({
  navigate: jest.fn(),
  getRedirectUrl: jest.fn().mockReturnValue(id),
});

describe('LogsExplorerTabs', () => {
  const renderTabs = (selectedTab: LogsExplorerTabsProps['selectedTab'] = 'discover') => {
    const mockDiscoverLocator = createMockLocator(DISCOVER_APP_LOCATOR);
    const mockLogsExplorerLocator = createMockLocator(ALL_DATASETS_LOCATOR_ID);
    const services = {
      ...discoverServiceMock,
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
                  return mockLogsExplorerLocator;
                default:
                  throw new Error(`Unknown locator id: ${id}`);
              }
            }),
          },
        },
      },
    } as unknown as typeof discoverServiceMock;

    render(<LogsExplorerTabs services={services} selectedTab={selectedTab} />);

    return {
      mockDiscoverLocator,
      mockLogsExplorerLocator,
    };
  };

  const getDiscoverTab = () => screen.getByText('Discover').closest('a')!;
  const getLogsExplorerTab = () => screen.getByText('Logs Explorer').closest('a')!;

  it('should render properly', () => {
    const { mockDiscoverLocator, mockLogsExplorerLocator } = renderTabs();
    expect(getDiscoverTab()).toBeInTheDocument();
    expect(mockDiscoverLocator.getRedirectUrl).toHaveBeenCalledWith({});
    expect(getDiscoverTab()).toHaveAttribute('href', DISCOVER_APP_LOCATOR);
    expect(getLogsExplorerTab()).toBeInTheDocument();
    expect(mockLogsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({});
    expect(getLogsExplorerTab()).toHaveAttribute('href', ALL_DATASETS_LOCATOR_ID);
  });

  it('should render Discover as the selected tab', () => {
    const { mockDiscoverLocator, mockLogsExplorerLocator } = renderTabs();
    expect(getDiscoverTab()).toHaveAttribute('aria-selected', 'true');
    userEvent.click(getDiscoverTab());
    expect(mockDiscoverLocator.navigate).not.toHaveBeenCalled();
    expect(getLogsExplorerTab()).toHaveAttribute('aria-selected', 'false');
    userEvent.click(getLogsExplorerTab());
    expect(mockLogsExplorerLocator.navigate).toHaveBeenCalledWith({});
  });

  it('should render Log Explorer as the selected tab', () => {
    const { mockDiscoverLocator, mockLogsExplorerLocator } = renderTabs('logs-explorer');
    expect(getLogsExplorerTab()).toHaveAttribute('aria-selected', 'true');
    userEvent.click(getLogsExplorerTab());
    expect(mockLogsExplorerLocator.navigate).not.toHaveBeenCalled();
    expect(getDiscoverTab()).toHaveAttribute('aria-selected', 'false');
    userEvent.click(getDiscoverTab());
    expect(mockDiscoverLocator.navigate).toHaveBeenCalledWith({});
  });
});
