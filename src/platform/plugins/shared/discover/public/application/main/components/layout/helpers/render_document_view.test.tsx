/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../../__mocks__/test_provider';
import { useGetDiscoverGridFlyoutRenderer } from './render_document_view';

const createMockRecord = (id: string): DataTableRecord =>
  buildDataTableRecord(
    {
      _index: 'test',
      _id: id,
      _score: 1,
      _source: { message: `doc-${id}` },
    },
    dataViewMock
  );

describe('useGetDiscoverGridFlyoutRenderer', () => {
  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock({
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });

    const { result } = renderHook(() => useGetDiscoverGridFlyoutRenderer(), {
      wrapper: ({ children }) => (
        <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
      ),
    });

    return { result, toolkit };
  };

  it('returns DiscoverGridFlyoutRenderer and renderDocumentView', async () => {
    const { result } = await setup();

    expect(result.current.DiscoverGridFlyoutRenderer).toBeDefined();
    expect(result.current.flyoutConnectionHandler).toBeDefined();
    expect(typeof result.current.DiscoverGridFlyoutRenderer).toBe('function');
    expect(typeof result.current.flyoutConnectionHandler).toBe('function');
  });

  it('flyoutConnectionHandler returns externalStore and setExpandedDoc', async () => {
    const { result } = await setup();
    const displayedRows = esHitsMock
      .slice(0, 2)
      .map((hit) => buildDataTableRecord(hit, dataViewMock));
    const displayedColumns = ['_source', 'message'];

    const docViewerHelpers = result.current.flyoutConnectionHandler(
      displayedRows,
      displayedColumns,
      undefined
    );

    expect(docViewerHelpers).toHaveProperty('externalStore');
    expect(docViewerHelpers).toHaveProperty('setExpandedDoc');
    expect(typeof docViewerHelpers.setExpandedDoc).toBe('function');
  });

  it('externalStore has subscribe, getSnapshot, and getServerSnapshot', async () => {
    const { result } = await setup();
    const displayedRows = esHitsMock
      .slice(0, 2)
      .map((hit) => buildDataTableRecord(hit, dataViewMock));

    const { externalStore } = result.current.flyoutConnectionHandler(
      displayedRows,
      ['_source'],
      undefined
    );

    expect(typeof externalStore.subscribe).toBe('function');
    expect(typeof externalStore.getSnapshot).toBe('function');
    expect(typeof externalStore.getServerSnapshot).toBe('function');
  });

  it('getSnapshot returns expandedDoc from store', async () => {
    const { result } = await setup();
    const displayedRows = esHitsMock
      .slice(0, 2)
      .map((hit) => buildDataTableRecord(hit, dataViewMock));

    const { externalStore, setExpandedDoc } = result.current.flyoutConnectionHandler(
      displayedRows,
      ['_source'],
      undefined
    );

    expect(externalStore.getSnapshot()).toEqual({ expandedDoc: undefined });

    const docToExpand = displayedRows[0];
    await act(async () => {
      setExpandedDoc(docToExpand);
    });

    // Snapshot updates asynchronously via debounced notifyListeners (100ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(externalStore.getSnapshot().expandedDoc).toEqual(docToExpand);
  });

  it('does not call setExpandedDoc when first row id is the same', async () => {
    const { result, toolkit } = await setup();
    const dispatchSpy = jest.spyOn(toolkit.internalState, 'dispatch');

    const rows = [createMockRecord('1'), createMockRecord('2')];
    result.current.flyoutConnectionHandler(rows, ['_source'], undefined);
    dispatchSpy.mockClear();

    const sameFirstRowDifferentSecond = [rows[0], createMockRecord('3')];
    result.current.flyoutConnectionHandler(sameFirstRowDifferentSecond, ['_source'], undefined);

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setExpandedDoc'),
        payload: expect.objectContaining({ expandedDoc: undefined }),
      })
    );
  });
});
