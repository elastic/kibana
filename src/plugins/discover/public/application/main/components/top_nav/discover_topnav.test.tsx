/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenu, TopNavMenuData } from '@kbn/navigation-plugin/public';
import { Query } from '@kbn/es-query';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_provider';

setHeaderActionMenuMounter(jest.fn());

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: jest.requireActual('../../../../__mocks__/services').discoverServiceMock,
  }),
}));

function getProps(savePermissions = true): DiscoverTopNavProps {
  discoverServiceMock.capabilities.discover!.save = savePermissions;
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.transitions.setDataView(dataViewMock);

  return {
    stateContainer,
    navigateTo: jest.fn(),
    query: {} as Query,
    savedQuery: '',
    updateQuery: jest.fn(),
    onOpenInspector: jest.fn(),
    onFieldEdited: jest.fn(),
    isPlainRecord: false,
  };
}

describe('Discover topnav component', () => {
  test('generated config of TopNavMenu config is correct when discover save permissions are assigned', () => {
    const props = getProps(true);
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topNavMenu = component.find(TopNavMenu);
    const topMenuConfig = topNavMenu.props().config?.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['options', 'new', 'open', 'share', 'inspect', 'save']);
  });

  test('generated config of TopNavMenu config is correct when no discover save permissions are assigned', () => {
    const props = getProps(false);
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topNavMenu = component.find(TopNavMenu).props();
    const topMenuConfig = topNavMenu.config?.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['options', 'new', 'open', 'share', 'inspect']);
  });
});
