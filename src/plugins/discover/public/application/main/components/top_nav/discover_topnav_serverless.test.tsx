/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { DiscoverTopNavServerless } from './discover_topnav_serverless';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock as mockDiscoverService } from '../../../../__mocks__/services';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LogExplorerTabs } from '../../../../components/log_explorer_tabs';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
}));

function getProps() {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.transitions.setDataView(dataViewMock);

  return {
    stateContainer,
  };
}

const mockUseKibana = useKibana as jest.Mock;

describe('DiscoverTopNavServerless', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: mockDiscoverService,
    });
  });

  it('should not render when serverless plugin is not defined', () => {
    const props = getProps();
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNavServerless {...props} />
      </DiscoverMainProvider>
    );
    expect(component.find(DiscoverTopNavServerless).isEmptyRender()).toBe(true);
  });

  it('should render when serverless plugin is defined and displayMode is "standalone"', () => {
    mockUseKibana.mockReturnValue({
      services: {
        ...mockDiscoverService,
        serverless: true,
      },
    });
    const props = getProps();
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNavServerless {...props} />
      </DiscoverMainProvider>
    );
    expect(component.find(DiscoverTopNavServerless).isEmptyRender()).toBe(false);
  });

  it('should not render when serverless plugin is defined and displayMode is not "standalone"', () => {
    mockUseKibana.mockReturnValue({
      services: {
        ...mockDiscoverService,
        serverless: true,
      },
    });
    const props = getProps();
    props.stateContainer.customizationContext.displayMode = 'embedded';
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNavServerless {...props} />
      </DiscoverMainProvider>
    );
    expect(component.find(DiscoverTopNavServerless).isEmptyRender()).toBe(true);
  });

  describe('LogExplorerTabs', () => {
    it('should render when showLogExplorerTabs is true', () => {
      mockUseKibana.mockReturnValue({
        services: {
          ...mockDiscoverService,
          serverless: true,
        },
      });
      const props = getProps();
      props.stateContainer.customizationContext.showLogExplorerTabs = true;
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNavServerless {...props} />
        </DiscoverMainProvider>
      );
      expect(component.find(DiscoverTopNavServerless)).toHaveLength(1);
      expect(component.find(LogExplorerTabs)).toHaveLength(1);
    });

    it('should not render when showLogExplorerTabs is false', () => {
      mockUseKibana.mockReturnValue({
        services: {
          ...mockDiscoverService,
          serverless: true,
        },
      });
      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNavServerless {...props} />
        </DiscoverMainProvider>
      );
      expect(component.find(DiscoverTopNavServerless)).toHaveLength(1);
      expect(component.find(LogExplorerTabs)).toHaveLength(0);
    });
  });
});
