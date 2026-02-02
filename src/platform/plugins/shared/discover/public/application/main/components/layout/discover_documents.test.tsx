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
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { DiscoverDocuments, onResize } from './discover_documents';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { InternalStateMockToolkit } from '../../../../__mocks__/discover_state.mock';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverGrid } from '../../../../components/discover_grid';
import { internalStateActions, selectTabRuntimeState } from '../../state_management/redux';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import type { DiscoverServices } from '../../../../build_services';

const setup = async ({ services }: { services?: DiscoverServices } = {}) => {
  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();
  const { customizationService } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });

  return { toolkit, customizationService };
};

async function mountComponent({
  fetchStatus,
  hits,
  toolkit,
}: {
  fetchStatus: FetchStatus;
  hits: EsHitRecord[];
  toolkit?: InternalStateMockToolkit;
}) {
  if (!toolkit) {
    ({ toolkit } = await setup());
  }

  const stateContainer = selectTabRuntimeState(
    toolkit.runtimeStateManager,
    toolkit.getCurrentTab().id
  ).stateContainer$.getValue()!;

  stateContainer.dataState.data$.documents$.next({
    fetchStatus,
    result: hits.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  });

  const props = {
    viewModeToggle: <div data-test-subj="viewModeToggle">test</div>,
    dataView: dataViewMock,
    onAddFilter: jest.fn(),
    stateContainer,
    onFieldEdited: jest.fn(),
  };

  const component = mountWithIntl(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverDocuments {...props} />
    </DiscoverToolkitTestProvider>
  );

  await act(async () => {
    component.update();
  });

  return component;
}

describe('Discover documents layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('render loading when loading and no documents', async () => {
    const component = await mountComponent({ fetchStatus: FetchStatus.LOADING, hits: [] });
    expect(component.find('.dscDocuments__loading').exists()).toBeTruthy();
    expect(component.find('.dscTable').exists()).toBeFalsy();
  });

  test('render complete when loading but documents were already fetched', async () => {
    const component = await mountComponent({ fetchStatus: FetchStatus.LOADING, hits: esHitsMock });
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });

  test('render complete', async () => {
    const component = await mountComponent({ fetchStatus: FetchStatus.COMPLETE, hits: esHitsMock });
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
    expect(findTestSubject(component, 'unifiedDataTableToolbar').exists()).toBe(true);
    expect(findTestSubject(component, 'unifiedDataTableToolbarBottom').exists()).toBe(true);
    expect(findTestSubject(component, 'viewModeToggle').exists()).toBe(true);
  });

  test('should set rounded width to state on resize column', async () => {
    const { toolkit } = await setup();

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: {
          grid: { columns: { timestamp: { width: 173 }, someField: { width: 197 } } },
        },
      })
    );

    onResize(
      {
        columnId: 'someField',
        width: 205.5435345534,
      },
      toolkit.getCurrentTab().appState.grid,
      (grid) => {
        toolkit.internalState.dispatch(
          internalStateActions.updateAppState({
            tabId: toolkit.getCurrentTab().id,
            appState: { grid },
          })
        );
      }
    );

    expect(toolkit.getCurrentTab().appState.grid?.columns?.someField.width).toEqual(206);
  });

  describe('context awareness', () => {
    it('should pass cell renderers from profile', async () => {
      const services = createDiscoverServicesMock();

      await services.profilesManager.resolveRootProfile({ solutionNavId: 'test' });

      const { toolkit } = await setup({ services });
      const component = await mountComponent({
        fetchStatus: FetchStatus.COMPLETE,
        hits: esHitsMock,
        toolkit,
      });
      const discoverGridComponent = component.find(DiscoverGrid);

      expect(discoverGridComponent.exists()).toBeTruthy();
      expect(Object.keys(discoverGridComponent.prop('externalCustomRenderers')!)).toEqual([
        'rootProfile',
      ]);
    });
  });
});
