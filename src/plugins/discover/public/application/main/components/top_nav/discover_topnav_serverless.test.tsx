/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';

describe('ServerlessTopNav', () => {
  it('should not render when serverless plugin is not defined', () => {
    const props = getProps();
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    expect(component.find(ServerlessTopNav)).toHaveLength(0);
    const searchBar = component.find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu);
    expect(searchBar.prop('badges')).toBeDefined();
    expect(searchBar.prop('config')).toBeDefined();
    expect(searchBar.prop('setMenuMountPoint')).toBeDefined();
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
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    expect(component.find(ServerlessTopNav)).toHaveLength(1);
    const searchBar = component.find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu);
    expect(searchBar.prop('badges')).toBeUndefined();
    expect(searchBar.prop('config')).toBeUndefined();
    expect(searchBar.prop('setMenuMountPoint')).toBeUndefined();
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
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    expect(component.find(ServerlessTopNav)).toHaveLength(0);
    const searchBar = component.find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu);
    expect(searchBar.prop('badges')).toBeUndefined();
    expect(searchBar.prop('config')).toBeUndefined();
    expect(searchBar.prop('setMenuMountPoint')).toBeUndefined();
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
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );
      expect(component.find(ServerlessTopNav)).toHaveLength(1);
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
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );
      expect(component.find(ServerlessTopNav)).toHaveLength(1);
      expect(component.find(LogExplorerTabs)).toHaveLength(0);
    });
  });
});
