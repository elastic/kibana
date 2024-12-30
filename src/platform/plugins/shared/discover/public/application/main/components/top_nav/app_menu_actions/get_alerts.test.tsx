/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { AppMenuActionsMenuPopover } from './run_app_menu_action';
import { getAlertsAppMenuItem } from './get_alerts';
import { discoverServiceMock } from '../../../../../__mocks__/services';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';

const mount = (dataView = dataViewMock, isEsqlMode = false) => {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.actions.setDataView(dataView);

  const discoverParamsMock = {
    dataView,
    adHocDataViews: [],
    isEsqlMode,
    onNewSearch: jest.fn(),
    onOpenSavedSearch: jest.fn(),
    onUpdateAdHocDataViews: jest.fn(),
  };

  const alertsAppMenuItem = getAlertsAppMenuItem({
    discoverParams: discoverParamsMock,
    services: discoverServiceMock,
    stateContainer,
  });

  return mountWithIntl(
    <AppMenuActionsMenuPopover
      anchorElement={document.createElement('div')}
      appMenuItem={alertsAppMenuItem}
      services={discoverServiceMock}
      onClose={jest.fn()}
    />
  );
};

describe('OpenAlertsPopover', () => {
  describe('Dataview mode', () => {
    it('should render with the create search threshold rule button disabled if the data view has no time field', () => {
      const component = mount();
      expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeTruthy();
    });

    it('should render with the create search threshold rule button enabled if the data view has a time field', () => {
      const component = mount(dataViewWithTimefieldMock);
      expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeFalsy();
    });

    it('should render the manage rules and connectors link', () => {
      const component = mount();
      expect(findTestSubject(component, 'discoverManageAlertsButton').exists()).toBeTruthy();
    });
  });

  describe('ES|QL mode', () => {
    it('should render with the create search threshold rule button enabled if the data view has no timeFieldName but at least one time field', () => {
      const component = mount(dataViewMock, true);
      expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeFalsy();
    });

    it('should render with the create search threshold rule button enabled if the data view has a time field', () => {
      const component = mount(dataViewWithTimefieldMock, true);
      expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeFalsy();
    });

    it('should render with the create search threshold rule button disabled if the data view has no time fields at all', () => {
      const component = mount(dataViewWithNoTimefieldMock, true);
      expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeTruthy();
    });

    it('should render the manage rules and connectors link', () => {
      const component = mount();
      expect(findTestSubject(component, 'discoverManageAlertsButton').exists()).toBeTruthy();
    });
  });
});
