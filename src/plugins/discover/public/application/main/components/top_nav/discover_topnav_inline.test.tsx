/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { DiscoverTopNavInline } from './discover_topnav_inline';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock as mockDiscoverService } from '../../../../__mocks__/services';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
}));

function getProps({ hideNavMenuItems }: { hideNavMenuItems?: boolean } = {}) {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.transitions.setDataView(dataViewMock);
  stateContainer.customizationContext.displayMode = 'standalone';
  stateContainer.customizationContext.inlineTopNav.enabled = true;
  stateContainer.customizationContext.inlineTopNav.showLogsExplorerTabs = false;

  return {
    stateContainer,
    hideNavMenuItems,
  };
}

const mockUseKibana = useKibana as jest.Mock;

describe('DiscoverTopNavInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: mockDiscoverService,
    });
  });

  it('should not render when top nav inline is not enabled', async () => {
    const props = getProps();
    props.stateContainer.customizationContext.inlineTopNav.enabled = false;
    render(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNavInline {...props} />
      </DiscoverMainProvider>
    );
    const topNav = screen.queryByTestId('discoverTopNavInline');
    expect(topNav).toBeNull();
  });

  it('should render when top nav inline is enabled and displayMode is "standalone"', async () => {
    const props = getProps();
    render(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNavInline {...props} />
      </DiscoverMainProvider>
    );
    const topNav = screen.queryByTestId('discoverTopNavInline');
    expect(topNav).not.toBeNull();
  });

  it('should not render when top nav inline is enabled and displayMode is not "standalone"', async () => {
    const props = getProps();
    props.stateContainer.customizationContext.displayMode = 'embedded';
    render(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNavInline {...props} />
      </DiscoverMainProvider>
    );
    const topNav = screen.queryByTestId('discoverTopNavInline');
    expect(topNav).toBeNull();
  });

  describe('nav menu items', () => {
    it('should show nav menu items when hideNavMenuItems is false', async () => {
      const props = getProps();
      render(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNavInline {...props} />
        </DiscoverMainProvider>
      );
      const topNav = screen.queryByTestId('discoverTopNavInline');
      expect(topNav).not.toBeNull();
      await waitFor(() => {
        const topNavMenuItems = screen.queryByTestId('topNavMenuItems');
        expect(topNavMenuItems).not.toBeNull();
      });
    });

    it('should hide nav menu items when hideNavMenuItems is true', async () => {
      const props = getProps({ hideNavMenuItems: true });
      render(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNavInline {...props} />
        </DiscoverMainProvider>
      );
      const topNav = screen.queryByTestId('discoverTopNavInline');
      expect(topNav).not.toBeNull();
      await waitFor(() => {
        const topNavMenuItems = screen.queryByTestId('topNavMenuItems');
        expect(topNavMenuItems).toBeNull();
      });
    });
  });

  describe('LogsExplorerTabs', () => {
    it('should render when showLogsExplorerTabs is true', async () => {
      const props = getProps();
      props.stateContainer.customizationContext.inlineTopNav.showLogsExplorerTabs = true;
      render(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNavInline {...props} />
        </DiscoverMainProvider>
      );
      const topNav = screen.queryByTestId('discoverTopNavInline');
      expect(topNav).not.toBeNull();
      await waitFor(() => {
        const logsExplorerTabs = screen.queryByTestId('logsExplorerTabs');
        expect(logsExplorerTabs).not.toBeNull();
      });
    });

    it('should not render when showLogsExplorerTabs is false', async () => {
      const props = getProps();
      render(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNavInline {...props} />
        </DiscoverMainProvider>
      );
      const topNav = screen.queryByTestId('discoverTopNavInline');
      expect(topNav).not.toBeNull();
      await waitFor(() => {
        const logsExplorerTabs = screen.queryByTestId('logsExplorerTabs');
        expect(logsExplorerTabs).toBeNull();
      });
    });
  });
});
