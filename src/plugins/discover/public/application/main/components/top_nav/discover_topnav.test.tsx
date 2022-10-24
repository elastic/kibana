/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { Query } from '@kbn/es-query';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_react';

setHeaderActionMenuMounter(jest.fn());

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: jest.requireActual('../../../../__mocks__/services').discoverServiceMock,
  }),
}));

function getProps(savePermissions = true): DiscoverTopNavProps {
  discoverServiceMock.capabilities.discover!.save = savePermissions;

  return {
    stateContainer: getDiscoverStateMock({ isTimeBased: true }),
    navigateTo: jest.fn(),
    query: {} as Query,
    savedQuery: '',
    onOpenInspector: jest.fn(),
    onFieldEdited: jest.fn(),
    isPlainRecord: false,
    persistDataView: jest.fn(),
    updateAdHocDataViewId: jest.fn(),
    adHocDataViewList: [],
  };
}

describe('Discover topnav component', () => {
  test('generated config of TopNavMenu config is correct when discover save permissions are assigned', () => {
    const props = getProps(true);
    const component = shallowWithIntl(<DiscoverTopNav {...props} />, {
      context: {
        wrappingComponent: DiscoverMainProvider,
        wrappingComponentProps: { value: getDiscoverStateMock({}) },
      },
    });
    const topMenuConfig = component.props().config.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['options', 'new', 'open', 'share', 'inspect', 'save']);
  });

  test('generated config of TopNavMenu config is correct when no discover save permissions are assigned', () => {
    const props = getProps(false);
    const component = shallowWithIntl(
      <DiscoverMainProvider value={getDiscoverStateMock({})}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topMenuConfig = component.props().config.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['options', 'new', 'open', 'share', 'inspect']);
  });
});
