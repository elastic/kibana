/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiProvider } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { DiscoverDocuments, type DiscoverDocumentsProps, onResize } from './discover_documents';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import type { DiscoverAppState } from '../../state_management/discover_app_state_container';
import type {
  DiscoverCustomization,
  DiscoverCustomizationService,
} from '../../../../customizations';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import { createCustomizationService } from '../../../../customizations/customization_service';
import { DiscoverGrid } from '../../../../components/discover_grid';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { CurrentTabProvider, internalStateActions } from '../../state_management/redux';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

async function mountComponent({
  fetchStatus,
  records = esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  services = createDiscoverServicesMock(),
  stateContainer = getDiscoverStateMock({}),
  customizationService = createCustomizationService(),
}: {
  fetchStatus: FetchStatus;
  records?: DataTableRecord[];
  services?: DiscoverServices;
  stateContainer?: DiscoverStateContainer;
  customizationService?: DiscoverCustomizationService;
}) {
  stateContainer.appState.update({
    dataSource: createDataViewDataSource({ dataViewId: dataViewMock.id! }),
  });
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataRequestParams)({
      dataRequestParams: {
        timeRangeRelative: {
          from: '2020-05-14T11:05:13.590',
          to: '2020-05-14T11:20:13.590',
        },
        timeRangeAbsolute: {
          from: '2020-05-14T11:05:13.590',
          to: '2020-05-14T11:20:13.590',
        },
      },
    })
  );
  stateContainer.dataState.data$.documents$.next({
    fetchStatus,
    result: records,
  });

  const props: DiscoverDocumentsProps = {
    viewModeToggle: <div data-test-subj="viewModeToggle">test</div>,
    dataView: dataViewMock,
    onAddFilter: jest.fn(),
    stateContainer,
    onFieldEdited: jest.fn(),
  };

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverCustomizationProvider value={customizationService}>
        <CurrentTabProvider currentTabId={stateContainer.getCurrentTab().id}>
          <DiscoverMainProvider value={stateContainer}>
            <EuiProvider highContrastMode={false}>
              <DiscoverDocuments {...props} />
            </EuiProvider>
          </DiscoverMainProvider>
        </CurrentTabProvider>
      </DiscoverCustomizationProvider>
    </KibanaContextProvider>
  );

  await act(async () => {
    component.update();
  });

  return { component };
}

describe('Discover documents layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('render loading when loading and no documents', async () => {
    const { component } = await mountComponent({ fetchStatus: FetchStatus.LOADING, records: [] });
    expect(component.find('.dscDocuments__loading').exists()).toBeTruthy();
    expect(component.find('.dscTable').exists()).toBeFalsy();
  });

  test('render complete when loading but documents were already fetched', async () => {
    const { component } = await mountComponent({ fetchStatus: FetchStatus.LOADING });
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });

  test('render complete', async () => {
    const { component } = await mountComponent({ fetchStatus: FetchStatus.COMPLETE });
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
    expect(findTestSubject(component, 'unifiedDataTableToolbar').exists()).toBe(true);
    expect(findTestSubject(component, 'unifiedDataTableToolbarBottom').exists()).toBe(true);
    expect(findTestSubject(component, 'viewModeToggle').exists()).toBe(true);
  });

  test('should set rounded width to state on resize column', () => {
    const state = {
      grid: { columns: { timestamp: { width: 173 }, someField: { width: 197 } } },
    } as DiscoverAppState;
    const container = getDiscoverStateMock({});
    container.appState.update(state);

    onResize(
      {
        columnId: 'someField',
        width: 205.5435345534,
      },
      container
    );

    expect(container.appState.getState().grid?.columns?.someField.width).toEqual(206);
  });

  test('should render customisations', async () => {
    const customizationService = createCustomizationService();
    const customization: DiscoverCustomization = {
      id: 'data_table',
      logsEnabled: true,
      rowAdditionalLeadingControls: [],
    };
    customizationService.set(customization);
    const { component } = await mountComponent({
      fetchStatus: FetchStatus.COMPLETE,
      customizationService,
    });
    const discoverGridComponent = component.find(DiscoverGrid);
    expect(discoverGridComponent.exists()).toBeTruthy();
    expect(discoverGridComponent.prop('rowAdditionalLeadingControls')).toBe(
      customization.rowAdditionalLeadingControls
    );
    expect(discoverGridComponent.prop('getCustomCellRenderer')).toBeDefined();
    expect(discoverGridComponent.prop('customGridColumnsConfiguration')).toBeDefined();
  });

  describe('context awareness', () => {
    it('should use cell renderers from profiles', async () => {
      const services = createDiscoverServicesMock();
      await services.profilesManager.resolveRootProfile({ solutionNavId: 'test' });
      await services.profilesManager.resolveDataSourceProfile({});
      const records = esHitsMock.map((hit) =>
        services.profilesManager.resolveDocumentProfile({
          record: buildDataTableRecord(hit, dataViewMock),
        })
      );
      const stateContainer = getDiscoverStateMock({ services });
      stateContainer.appState.update({
        columns: ['rootProfile', 'dataSourceProfile', 'documentProfile'],
      });
      const { component } = await mountComponent({
        fetchStatus: FetchStatus.COMPLETE,
        records,
        services,
        stateContainer,
      });
      expect(
        findTestSubject(component, 'root-profile-renderer').first().getDOMNode()
      ).toHaveTextContent('root-profile');
      expect(
        findTestSubject(component, 'data-source-profile-renderer').first().getDOMNode()
      ).toHaveTextContent('data-source-profile');
      expect(
        findTestSubject(component, 'document-profile-renderer').first().getDOMNode()
      ).toHaveTextContent('document-profile');
    });
  });
});
