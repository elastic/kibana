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
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { DiscoverDocuments, onResize } from './discover_documents';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { InternalStateMockToolkit } from '../../../../__mocks__/discover_state.mock';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import type { DiscoverServices } from '../../../../build_services';
import { createEsqlDataSource } from '../../../../../common/data_sources';
import { createContextAwarenessMocks } from '../../../../context_awareness/__mocks__';

const singleEsHit = esHitsMock.slice(0, 1);

const setup = async ({ services }: { services?: DiscoverServices } = {}) => {
  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();
  await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
    skipWaitForDataFetching: true,
  });

  return { toolkit };
};

async function mountComponent({
  fetchStatus,
  hits,
  toolkit,
  isEsqlMode,
}: {
  fetchStatus: FetchStatus;
  hits: EsHitRecord[];
  toolkit?: InternalStateMockToolkit;
  isEsqlMode?: boolean;
}) {
  if (!toolkit) {
    ({ toolkit } = await setup());
  }

  if (isEsqlMode) {
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: {
          dataSource: createEsqlDataSource(),
          query: { esql: 'from *' },
        },
      })
    );
  }

  const testDocuments = {
    fetchStatus,
    result: hits.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  };

  const dataStateContainer = toolkit.getCurrentTabDataStateContainer();

  dataStateContainer.data$.documents$.next(testDocuments);

  // Prevent any further updates to documents$ from clearing test data
  dataStateContainer.data$.documents$.next = jest.fn();

  const props = {
    viewModeToggle: <div data-test-subj="viewModeToggle">test</div>,
    dataView: dataViewMock,
    onAddFilter: jest.fn(),
    onFieldEdited: jest.fn(),
  };

  return renderWithI18n(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverDocuments {...props} />
    </DiscoverToolkitTestProvider>
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

  test('ES|QL: render complete when partial and documents were already fetched', async () => {
    await mountComponent({
      fetchStatus: FetchStatus.PARTIAL,
      hits: singleEsHit,
      isEsqlMode: true,
    });
    expect(screen.queryByText('Loading documents')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverDocumentsTable')).toBeVisible();
  });

  test('ES|QL: render loading when partial and no documents', async () => {
    await mountComponent({
      fetchStatus: FetchStatus.PARTIAL,
      hits: [],
      isEsqlMode: true,
    });
    expect(screen.getByText('Loading documents')).toBeVisible();
    expect(screen.queryByTestId('discoverDocumentsTable')).not.toBeInTheDocument();
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
      const { profilesManagerMock, rootProfileProviderMock } = createContextAwarenessMocks();
      services.profilesManager = profilesManagerMock;
      await services.profilesManager.resolveRootProfile({ solutionNavId: 'test' });

      const { toolkit } = await setup({ services });
      await mountComponent({
        fetchStatus: FetchStatus.COMPLETE,
        hits: esHitsMock,
        toolkit,
      });

      expect(rootProfileProviderMock.profile.getCellRenderers).toHaveBeenCalled();
    });
  });
});
