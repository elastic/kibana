/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { from, throwError } from 'rxjs';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { buildDataTableRecord, type DataTableColumnsMeta } from '@kbn/discover-utils';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { DiscoverServices } from '../../../../build_services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions } from '../../state_management/redux';
import { FetchStatus } from '../../../types';
import { DiscoverDocumentFlyout } from './discover_document_flyout';

const [inResultsHit, outOfResultsHit] = esHitsMock;
const expandedDocRef = { id: outOfResultsHit._id, index: outOfResultsHit._index };

const searchResponseFor = (hit: EsHitRecord): Promise<IKibanaSearchResponse> =>
  Promise.resolve({ rawResponse: { hits: { hits: [hit] } } });

const setup = async ({
  searchResult,
  hits = [inResultsHit],
  fetchStatus = FetchStatus.COMPLETE,
  withRef = true,
  services = createDiscoverServicesMock(),
}: {
  searchResult?: Promise<IKibanaSearchResponse> | Error;
  hits?: EsHitRecord[];
  fetchStatus?: FetchStatus;
  withRef?: boolean;
  services?: DiscoverServices;
} = {}) => {
  setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

  if (searchResult) {
    jest
      .mocked(services.data.search.search)
      .mockImplementation(() =>
        searchResult instanceof Error ? throwError(() => searchResult) : from(searchResult)
      );
  }

  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();
  await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
    skipWaitForDataFetching: true,
  });

  if (withRef) {
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { expandedDoc: expandedDocRef },
      })
    );
  }

  const dataStateContainer = toolkit.getCurrentTabDataStateContainer();

  dataStateContainer.data$.documents$.next({
    fetchStatus,
    result: hits.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  });

  // Prevent any further updates to documents$ from clearing test data
  dataStateContainer.data$.documents$.next = jest.fn();

  renderWithI18n(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverDocumentFlyout
        dataView={dataViewMock}
        columns={['bytes']}
        onAddColumn={jest.fn()}
        onRemoveColumn={jest.fn()}
        onAddFilter={jest.fn()}
      />
    </DiscoverToolkitTestProvider>
  );

  return { toolkit, services };
};

describe('DiscoverDocumentFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no document is expanded', async () => {
    await setup({ withRef: false });

    expect(screen.queryByTestId('docViewerFlyout')).not.toBeInTheDocument();
  });

  it('opens the flyout with a directly fetched document that is not in the results', async () => {
    const { toolkit } = await setup({ searchResult: searchResponseFor(outOfResultsHit) });

    await waitFor(() => {
      expect(toolkit.getCurrentTab().expandedDoc?.raw._id).toBe(outOfResultsHit._id);
    });

    expect(screen.getByTestId('docViewerFlyout')).toBeVisible();
    expect(screen.getByTestId('expandedDocNotice-NotInResults')).toBeVisible();
    expect(screen.queryByTestId('docViewerFlyoutNavigation')).not.toBeInTheDocument();
  });

  it('uses the instance from the results without fetching when they already contain it', async () => {
    const { toolkit, services } = await setup({
      searchResult: searchResponseFor(outOfResultsHit),
      hits: esHitsMock,
    });

    await waitFor(() => {
      expect(toolkit.getCurrentTab().expandedDoc?.raw._id).toBe(outOfResultsHit._id);
    });

    // The record from the result set is the one the grid renders, so pagination and the row
    // highlight only work with that instance rather than a directly fetched copy
    const rowFromResults = toolkit
      .getCurrentTabDataStateContainer()
      .data$.documents$.getValue()
      .result?.find((row) => row.raw._id === outOfResultsHit._id);

    expect(toolkit.getCurrentTab().expandedDoc).toBe(rowFromResults);
    expect(services.data.search.search).not.toHaveBeenCalled();
    expect(screen.queryByTestId('expandedDocNotice-NotInResults')).not.toBeInTheDocument();
  });

  it('keeps the instance from the results when the direct fetch finishes after them', async () => {
    const services = createDiscoverServicesMock();
    let resolveSearch: (response: IKibanaSearchResponse) => void = () => {};

    jest
      .mocked(services.data.search.search)
      .mockImplementation(() =>
        from(new Promise<IKibanaSearchResponse>((resolve) => (resolveSearch = resolve)))
      );

    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { expandedDoc: expandedDocRef },
      })
    );

    const documents$ = toolkit.getCurrentTabDataStateContainer().data$.documents$;

    // The document is not in the results yet, so the direct fetch starts
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      result: [buildDataTableRecord(inResultsHit, dataViewMock)],
    });

    renderWithI18n(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DiscoverDocumentFlyout
          dataView={dataViewMock}
          columns={['bytes']}
          onAddColumn={jest.fn()}
          onRemoveColumn={jest.fn()}
          onAddFilter={jest.fn()}
        />
      </DiscoverToolkitTestProvider>
    );

    await waitFor(() => {
      expect(services.data.search.search).toHaveBeenCalled();
    });

    // The main search comes back with the document while the direct fetch is still in flight
    act(() => {
      documents$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock)),
      });
    });

    const rowFromResults = documents$
      .getValue()
      .result?.find((row) => row.raw._id === outOfResultsHit._id);

    await waitFor(() => {
      expect(toolkit.getCurrentTab().expandedDoc).toBe(rowFromResults);
    });

    // The late direct fetch must not replace the instance the grid renders, since only that one
    // restores flyout pagination and the row highlight
    await act(async () => {
      resolveSearch({ rawResponse: { hits: { hits: [outOfResultsHit] } } });
    });

    expect(toolkit.getCurrentTab().expandedDoc).toBe(rowFromResults);
  });

  it('reports that it is still searching while the results are loading', async () => {
    await setup({
      searchResult: searchResponseFor(outOfResultsHit),
      fetchStatus: FetchStatus.LOADING,
    });

    await waitFor(() => {
      expect(screen.getByTestId('expandedDocNotice-SearchingResults')).toBeVisible();
    });
  });

  it('shows a not found state when the document no longer exists', async () => {
    await setup({ searchResult: Promise.resolve({ rawResponse: { hits: { hits: [] } } }) });

    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyoutNotFound')).toBeVisible();
    });

    // Nothing belongs in the subheader for a document that could not be resolved, so it should
    // not render as an empty bordered strip
    expect(screen.queryByTestId('docViewerFlyoutNotice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docViewerFlyoutActions')).not.toBeInTheDocument();
  });

  it('shows an error state when the document cannot be fetched', async () => {
    await setup({ searchResult: new Error('search failed') });

    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyoutError')).toBeVisible();
    });
  });

  it('closes the flyout when the reference is removed from the URL', async () => {
    const { toolkit } = await setup({ searchResult: searchResponseFor(outOfResultsHit) });

    await waitFor(() => {
      expect(toolkit.getCurrentTab().expandedDoc).toBeDefined();
    });

    // Mirrors the browser back button reverting the app state
    act(() => {
      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: { expandedDoc: undefined },
        })
      );
    });

    await waitFor(() => {
      expect(toolkit.getCurrentTab().expandedDoc).toBeUndefined();
      expect(screen.queryByTestId('docViewerFlyout')).not.toBeInTheDocument();
    });
  });

  it('renders a cascade owned document with the columns and meta reported by its grid', async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });

    const tabId = toolkit.getCurrentTab().id;
    const expandedDoc = buildDataTableRecord(esHitsMock[0], dataViewMock);
    const nextExpandedDoc = buildDataTableRecord(esHitsMock[1], dataViewMock);
    const cascadedColumnsMeta: DataTableColumnsMeta = { bytes: { type: 'number' } };

    toolkit.internalState.dispatch(
      internalStateActions.setExpandedDoc({ tabId, expandedDoc, expandedDocOwner: 'nested-grid' })
    );
    toolkit.internalState.dispatch(
      internalStateActions.setRenderDocumentViewMeta({
        tabId,
        renderDocumentViewMeta: {
          displayedRows: [expandedDoc, nextExpandedDoc],
          displayedColumns: ['bytes'],
        },
      })
    );
    toolkit.internalState.dispatch(
      internalStateActions.setCascadedDocumentsState({
        tabId,
        cascadedDocumentsState: {
          ...toolkit.getCurrentTab().cascadedDocumentsState,
          columnsMeta: cascadedColumnsMeta,
        },
      })
    );

    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    const dataStateContainer = toolkit.getCurrentTabDataStateContainer();

    dataStateContainer.data$.documents$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock)),
    });
    dataStateContainer.data$.documents$.next = jest.fn();

    renderWithI18n(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DiscoverDocumentFlyout
          dataView={dataViewMock}
          columns={['bytes']}
          onAddColumn={jest.fn()}
          onRemoveColumn={jest.fn()}
          onAddFilter={jest.fn()}
        />
      </DiscoverToolkitTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyout')).toBeVisible();
    });

    // Navigating within the flyout keeps the cascade grid as the owner
    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyoutNavigation')).toBeVisible();
    });

    act(() => {
      toolkit.internalState.dispatch(
        internalStateActions.setExpandedDoc({
          tabId,
          expandedDoc: nextExpandedDoc,
          expandedDocOwner: 'nested-grid',
        })
      );
    });

    await waitFor(() => {
      expect(toolkit.getCurrentTab().expandedDoc).toEqual(nextExpandedDoc);
      expect(toolkit.getCurrentTab().expandedDocOwner).toBe('nested-grid');
    });

    // Cascade owned documents are not deep linkable, so no reference is written
    expect(toolkit.getCurrentTab().appState.expandedDoc).toBeUndefined();
  });

  it('does not fetch when the expanded document already matches the reference', async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });

    toolkit.internalState.dispatch(
      internalStateActions.setExpandedDoc({
        tabId: toolkit.getCurrentTab().id,
        expandedDoc: buildDataTableRecord(inResultsHit, dataViewMock),
      })
    );

    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    const dataStateContainer = toolkit.getCurrentTabDataStateContainer();

    dataStateContainer.data$.documents$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: [buildDataTableRecord(inResultsHit, dataViewMock)],
    });
    dataStateContainer.data$.documents$.next = jest.fn();

    renderWithI18n(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DiscoverDocumentFlyout
          dataView={dataViewMock}
          columns={['bytes']}
          onAddColumn={jest.fn()}
          onRemoveColumn={jest.fn()}
          onAddFilter={jest.fn()}
        />
      </DiscoverToolkitTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('docViewerFlyout')).toBeVisible();
    });

    expect(services.data.search.search).not.toHaveBeenCalled();
    expect(toolkit.getCurrentTab().appState.expandedDoc).toEqual({
      id: inResultsHit._id,
      index: inResultsHit._index,
    });
  });
});
