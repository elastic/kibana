/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataDocuments$ } from '../../services/discover_data_state_container';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { DiscoverDocuments, onResize } from './discover_documents';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverAppState } from '../../services/discover_app_state_container';
import { DiscoverCustomization, DiscoverCustomizationProvider } from '../../../../customizations';
import { createCustomizationService } from '../../../../customizations/customization_service';
import { DiscoverGrid } from '../../../../components/discover_grid';

const customisationService = createCustomizationService();

async function mountComponent(fetchStatus: FetchStatus, hits: EsHitRecord[]) {
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const documents$ = new BehaviorSubject({
    fetchStatus,
    result: hits.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  }) as DataDocuments$;
  const stateContainer = getDiscoverStateMock({});
  stateContainer.appState.update({ index: dataViewMock.id });
  stateContainer.dataState.data$.documents$ = documents$;

  const props = {
    viewModeToggle: <div data-test-subj="viewModeToggle">test</div>,
    dataView: dataViewMock,
    onAddFilter: jest.fn(),
    stateContainer,
    onFieldEdited: jest.fn(),
  };

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverCustomizationProvider value={customisationService}>
        <DiscoverMainProvider value={stateContainer}>
          <DiscoverDocuments {...props} />
        </DiscoverMainProvider>
      </DiscoverCustomizationProvider>
    </KibanaContextProvider>
  );
  await act(async () => {
    component.update();
  });
  return component;
}

describe('Discover documents layout', () => {
  test('render loading when loading and no documents', async () => {
    const component = await mountComponent(FetchStatus.LOADING, []);
    expect(component.find('.dscDocuments__loading').exists()).toBeTruthy();
    expect(component.find('.dscTable').exists()).toBeFalsy();
  });

  test('render complete when loading but documents were already fetched', async () => {
    const component = await mountComponent(FetchStatus.LOADING, esHitsMock);
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });

  test('render complete', async () => {
    const component = await mountComponent(FetchStatus.COMPLETE, esHitsMock);
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
    const customCellRenderer = {
      content: () => <span className="custom-renderer-test">Test</span>,
    };

    const customGridColumnsConfiguration = {
      content: () => ({
        id: 'content',
        displayText: <span className="custom-column-test">Column</span>,
      }),
    };

    const customControlColumnsConfiguration = () => ({
      leadingControlColumns: [],
      trailingControlColumns: [],
    });

    const customization: DiscoverCustomization = {
      id: 'data_table',
      customCellRenderer,
      customGridColumnsConfiguration,
      customControlColumnsConfiguration,
    };

    customisationService.set(customization);
    const component = await mountComponent(FetchStatus.COMPLETE, esHitsMock);
    const discoverGridComponent = component.find(DiscoverGrid);
    expect(discoverGridComponent.exists()).toBeTruthy();

    expect(discoverGridComponent.prop('externalCustomRenderers')).toEqual(customCellRenderer);
    expect(discoverGridComponent.prop('customGridColumnsConfiguration')).toEqual(
      customGridColumnsConfiguration
    );
    expect(discoverGridComponent.prop('customControlColumnsConfiguration')).toEqual(
      customControlColumnsConfiguration
    );
  });
});
