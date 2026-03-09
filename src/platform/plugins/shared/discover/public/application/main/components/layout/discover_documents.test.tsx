/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FetchStatus } from '../../../types';
import { DiscoverDocuments, onResize } from './discover_documents';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { internalStateActions } from '../../state_management/redux';
import { createEsqlDataSource } from '../../../../../common/data_sources';
import { createContextAwarenessMocks } from '../../../../context_awareness/__mocks__';
import { BehaviorSubject } from 'rxjs';
import type { DataDocuments$ } from '../../state_management/discover_data_state_container';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import type { DiscoverAppState } from '../../state_management/redux';
import { createCustomizationService } from '../../../../customizations/customization_service';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { type ProfilesManager } from '../../../../context_awareness';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

const singleEsHit = esHitsMock.slice(0, 1);
const customisationService = createCustomizationService();

async function mountComponent({
  fetchStatus,
  hits,
  profilesManager,
  isEsqlMode = false,
}: {
  fetchStatus: FetchStatus;
  hits: EsHitRecord[];
  profilesManager?: ProfilesManager;
  isEsqlMode?: boolean;
}) {
  const services = discoverServiceMock;

  services.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const documents$ = new BehaviorSubject({
    fetchStatus,
    result: hits.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  }) as DataDocuments$;
  const stateContainer = getDiscoverStateMock({});
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
      appState: isEsqlMode
        ? {
            dataSource: createEsqlDataSource(),
            query: { esql: 'from *' },
          }
        : {
            dataSource: createDataViewDataSource({ dataViewId: dataViewMock.id! }),
          },
    })
  );
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
        searchSessionId: 'test',
        isSearchSessionRestored: false,
      },
    })
  );

  stateContainer.dataState.data$.documents$ = documents$;

  const props = {
    viewModeToggle: <div data-test-subj="viewModeToggle">test</div>,
    dataView: dataViewMock,
    onAddFilter: jest.fn(),
    stateContainer,
    onFieldEdited: jest.fn(),
  };

  profilesManager = profilesManager ?? services.profilesManager;
  const scopedEbtManager = services.ebtManager.createScopedEBTManager();

  renderWithI18n(
    <DiscoverTestProvider
      services={{ ...services, profilesManager }}
      stateContainer={stateContainer}
      customizationService={customisationService}
      scopedProfilesManager={profilesManager.createScopedProfilesManager({ scopedEbtManager })}
      scopedEbtManager={scopedEbtManager}
    >
      <DiscoverDocuments {...props} />
    </DiscoverTestProvider>
  );
}

describe('Discover documents layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('render loading when loading and no documents', async () => {
    await mountComponent({ fetchStatus: FetchStatus.LOADING, hits: [] });
    expect(screen.getByText('Loading documents')).toBeVisible();
    expect(screen.queryByTestId('discoverDocumentsTable')).not.toBeInTheDocument();
  });

  test('render complete when loading but documents were already fetched', async () => {
    await mountComponent({ fetchStatus: FetchStatus.LOADING, hits: singleEsHit });
    expect(screen.queryByText('Loading documents')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverDocumentsTable')).toBeVisible();
  });

  test('render complete', async () => {
    await mountComponent({ fetchStatus: FetchStatus.COMPLETE, hits: esHitsMock });
    expect(screen.queryByText('Loading documents')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverDocumentsTable')).toBeVisible();
    expect(screen.getByTestId('unifiedDataTableToolbar')).toBeVisible();
    expect(screen.getByTestId('unifiedDataTableToolbarBottom')).toBeVisible();
    expect(screen.getByTestId('viewModeToggle')).toBeVisible();
  });

  test('ES|QL: should not show sample size control', async () => {
    await mountComponent({
      fetchStatus: FetchStatus.COMPLETE,
      hits: esHitsMock,
      isEsqlMode: true,
    });

    await userEvent.click(screen.getByTestId('dataGridDisplaySelectorButton'));

    await waitFor(() => {
      expect(screen.queryByTestId('unifiedDataTableSampleSizeInput')).not.toBeInTheDocument();
    });
  });

  test('should show sample size control when not in ES|QL mode', async () => {
    await mountComponent({
      fetchStatus: FetchStatus.COMPLETE,
      hits: esHitsMock,
      isEsqlMode: false,
    });

    await userEvent.click(screen.getByTestId('dataGridDisplaySelectorButton'));

    await waitFor(() => {
      expect(screen.getAllByTestId('unifiedDataTableSampleSizeInput').length).toBeGreaterThan(0);
    });
  });

  test('should set rounded width to state on resize column', async () => {
    const state = {
      grid: { columns: { timestamp: { width: 173 }, someField: { width: 197 } } },
    } as DiscoverAppState;
    const container = getDiscoverStateMock({});
    container.internalState.dispatch(
      container.injectCurrentTab(internalStateActions.updateAppState)({ appState: state })
    );

    onResize(
      {
        columnId: 'someField',
        width: 205.5435345534,
      },
      container.getCurrentTab().appState.grid,
      (grid) => {
        container.internalState.dispatch(
          container.injectCurrentTab(internalStateActions.updateAppState)({ appState: { grid } })
        );
      }
    );

    expect(container.getCurrentTab().appState.grid?.columns?.someField.width).toEqual(206);
  });

  describe('context awareness', () => {
    it('should pass cell renderers from profile', async () => {
      const { profilesManagerMock, rootProfileProviderMock } = createContextAwarenessMocks();
      discoverServiceMock.profilesManager = profilesManagerMock;
      await discoverServiceMock.profilesManager.resolveRootProfile({ solutionNavId: 'test' });

      await mountComponent({ fetchStatus: FetchStatus.COMPLETE, hits: esHitsMock });

      expect(rootProfileProviderMock.profile.getCellRenderers).toHaveBeenCalled();
    });
  });
});
