/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { useDocumentViewFlyoutConnectionHandler } from './use_document_view_flyout_connection_handler';

describe('useDocumentViewFlyoutConnectionHandler', () => {
  it('returns documentViewFlyoutConnectionHandler and connectedGridMeta', () => {
    const setExpandedDoc = jest.fn();
    const { result } = renderHook(() =>
      useDocumentViewFlyoutConnectionHandler({
        expandedDoc: undefined,
        setExpandedDoc,
      })
    );

    expect(result.current.documentViewFlyoutConnectionHandler).toBeDefined();
    expect(result.current.connectedGridMeta).toBeDefined();
    expect(typeof result.current.documentViewFlyoutConnectionHandler).toBe('function');
  });

  it('documentViewFlyoutConnectionHandler returns externalStore and setExpandedDoc', () => {
    const setExpandedDoc = jest.fn();
    const { result } = renderHook(() =>
      useDocumentViewFlyoutConnectionHandler({
        expandedDoc: undefined,
        setExpandedDoc,
      })
    );

    const displayedRows = esHitsMock
      .slice(0, 2)
      .map((hit) => buildDataTableRecord(hit, dataViewMock));
    const docViewerHelpers = result.current.documentViewFlyoutConnectionHandler(
      displayedRows,
      ['_source'],
      undefined
    );

    expect(docViewerHelpers).toHaveProperty('externalStore');
    expect(docViewerHelpers).toHaveProperty('setExpandedDoc');
    expect(typeof docViewerHelpers.setExpandedDoc).toBe('function');
  });

  it('externalStore has subscribe, getSnapshot, and getServerSnapshot', () => {
    const setExpandedDoc = jest.fn();
    const { result } = renderHook(() =>
      useDocumentViewFlyoutConnectionHandler({
        expandedDoc: undefined,
        setExpandedDoc,
      })
    );

    const displayedRows = esHitsMock
      .slice(0, 2)
      .map((hit) => buildDataTableRecord(hit, dataViewMock));
    const { externalStore } = result.current.documentViewFlyoutConnectionHandler(
      displayedRows,
      ['_source'],
      undefined
    );

    expect(typeof externalStore.subscribe).toBe('function');
    expect(typeof externalStore.getSnapshot).toBe('function');
    expect(typeof externalStore.getServerSnapshot).toBe('function');
  });

  it('getSnapshot returns expandedDoc from store', async () => {
    const displayedRows = esHitsMock
      .slice(0, 2)
      .map((hit) => buildDataTableRecord(hit, dataViewMock));
    const docToExpand = displayedRows[0];

    const setExpandedDoc = jest.fn();
    const { result } = renderHook(() =>
      useDocumentViewFlyoutConnectionHandler({
        expandedDoc: undefined,
        setExpandedDoc,
      })
    );

    const { externalStore, setExpandedDoc: setExpandedDocFromHandler } =
      result.current.documentViewFlyoutConnectionHandler(displayedRows, ['_source'], undefined);

    expect(externalStore.getSnapshot()).toEqual({ expandedDoc: undefined });

    await act(async () => {
      setExpandedDocFromHandler(docToExpand);
    });

    expect(externalStore.getSnapshot().expandedDoc).toEqual(docToExpand);
  });
});
