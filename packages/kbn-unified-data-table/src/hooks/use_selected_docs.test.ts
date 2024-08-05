/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { useSelectedDocs } from './use_selected_docs';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';

describe('useSelectedDocs', () => {
  const docs = generateEsHits(dataViewWithTimefieldMock, 5).map((hit) =>
    buildDataTableRecord(hit, dataViewWithTimefieldMock)
  );
  const docsMap = new Map(docs.map((doc) => [doc.id, doc]));

  test('should have a correct default state', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));
    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [],
        hasSelectedDocs: false,
      })
    );
  });

  test('should toggleDocSelection correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id],
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(true);
    expect(result.current.isDocSelected(docs[1].id)).toBe(false);

    act(() => {
      result.current.toggleDocSelection(docs[1].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id, docs[1].id],
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(true);
    expect(result.current.isDocSelected(docs[1].id)).toBe(true);

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[1].id],
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(false);
    expect(result.current.isDocSelected(docs[1].id)).toBe(true);

    act(() => {
      result.current.toggleDocSelection(docs[1].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [],
        hasSelectedDocs: false,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(false);
    expect(result.current.isDocSelected(docs[1].id)).toBe(false);
  });

  test('should replaceSelectedDocs correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
      result.current.toggleDocSelection(docs[1].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id, docs[1].id],
        hasSelectedDocs: true,
      })
    );

    act(() => {
      result.current.replaceSelectedDocs([docs[1].id, docs[2].id]);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[1].id, docs[2].id],
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(false);
    expect(result.current.isDocSelected(docs[1].id)).toBe(true);
    expect(result.current.isDocSelected(docs[2].id)).toBe(true);
  });

  test('should selectAllDocs correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.selectAllDocs();
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: docs.map((doc) => doc.id),
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(true);
    expect(result.current.isDocSelected(docs[docs.length - 1].id)).toBe(true);
  });

  test('should selectMoreDocs correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
      result.current.toggleDocSelection(docs[1].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id, docs[1].id],
        hasSelectedDocs: true,
      })
    );

    act(() => {
      result.current.selectMoreDocs([docs[1].id, docs[2].id]);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id, docs[1].id, docs[2].id],
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(true);
    expect(result.current.isDocSelected(docs[1].id)).toBe(true);
    expect(result.current.isDocSelected(docs[2].id)).toBe(true);
  });

  test('should deselectSomeDocs correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
      result.current.toggleDocSelection(docs[1].id);
      result.current.toggleDocSelection(docs[2].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id, docs[1].id, docs[2].id],
        hasSelectedDocs: true,
      })
    );

    act(() => {
      result.current.deselectSomeDocs([docs[0].id, docs[2].id]);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[1].id],
        hasSelectedDocs: true,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(false);
    expect(result.current.isDocSelected(docs[1].id)).toBe(true);
    expect(result.current.isDocSelected(docs[2].id)).toBe(false);
  });

  test('should clearAllSelectedDocs correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
      result.current.toggleDocSelection(docs[1].id);
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [docs[0].id, docs[1].id],
        hasSelectedDocs: true,
      })
    );

    act(() => {
      result.current.clearAllSelectedDocs();
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        selectedDocIds: [],
        hasSelectedDocs: false,
      })
    );

    expect(result.current.isDocSelected(docs[0].id)).toBe(false);
    expect(result.current.isDocSelected(docs[1].id)).toBe(false);
  });

  test('should getCountOfSelectedDocs correctly', () => {
    const { result } = renderHook(() => useSelectedDocs(docsMap));

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
      result.current.toggleDocSelection(docs[1].id);
    });

    expect(result.current.getCountOfSelectedDocs([docs[0].id, docs[1].id])).toBe(2);
    expect(result.current.getCountOfSelectedDocs([docs[2].id, docs[3].id])).toBe(0);

    act(() => {
      result.current.toggleDocSelection(docs[0].id);
    });

    expect(result.current.getCountOfSelectedDocs([docs[0].id, docs[1].id])).toBe(1);
    expect(result.current.getCountOfSelectedDocs([docs[1].id])).toBe(1);
    expect(result.current.getCountOfSelectedDocs([docs[0].id])).toBe(0);
    expect(result.current.getCountOfSelectedDocs([docs[2].id, docs[3].id])).toBe(0);
  });
});
