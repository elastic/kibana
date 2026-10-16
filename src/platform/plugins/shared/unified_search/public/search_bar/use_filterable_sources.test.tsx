/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core/public';
import type { DataSource } from '@kbn/data-source';
import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { DataView } from '@kbn/data-views-plugin/common';
import { useFilterableSources } from './use_filterable_sources';

const http = {} as HttpStart;

const createDataViewSource = (id: string) =>
  new DataViewSource(
    new DataView({
      spec: { id, title: `${id}-*`, timeFieldName: '@timestamp', fields: {} },
      fieldFormats: {} as DataView['fieldFormats'],
    })
  );

const createEsqlSource = (timeFieldName?: string) =>
  createMockEsqlSource(
    [{ name: 'bytes', type: 'number', esType: 'long', source: 'index' }],
    [],
    timeFieldName
  );

describe('useFilterableSources', () => {
  it('returns nothing when no data sources are given, so the explicit patterns are used as they are', () => {
    const { result } = renderHook(() => useFilterableSources(undefined, http));

    expect(result.current).toBeUndefined();
  });

  it('returns the DataView of a DSL source on the first render', () => {
    const source = createDataViewSource('dsl');

    const { result } = renderHook(() => useFilterableSources([source], http));

    expect(result.current).toEqual([source.getDataView()]);
  });

  it('does not render again after mounting when there are only DSL sources', async () => {
    const source = createDataViewSource('dsl');
    let renders = 0;

    renderHook(() => {
      renders++;
      return useFilterableSources([source], http);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(renders).toBe(1);
  });

  it('returns the same array while the DSL sources are the same, even if passed in a new array', () => {
    const source = createDataViewSource('dsl');

    const { result, rerender } = renderHook(() => useFilterableSources([source], http));
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });

  it('returns the current DataView of a DSL source that was replaced by another instance', async () => {
    const { result, rerender } = renderHook(
      ({ sources }: { sources: DataSource[] }) => useFilterableSources(sources, http),
      { initialProps: { sources: [createDataViewSource('dsl')] as DataSource[] } }
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const replacement = createDataViewSource('dsl');
    rerender({ sources: [replacement] });

    expect(result.current).toEqual([replacement.getDataView()]);
    expect(result.current![0]).toBe(replacement.getDataView());
  });

  it('keeps the order of mixed sources once the ES|QL one resolves', async () => {
    const dsl = createDataViewSource('dsl');
    const esql = createEsqlSource('@timestamp');

    const { result } = renderHook(() => useFilterableSources([dsl, esql], http));

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current!.map(({ id }) => id)).toEqual(['dsl', esql.datasetId]);
  });

  it('resolves an ES|QL source to its dataset identity', async () => {
    const source = createEsqlSource('@timestamp');

    const { result } = renderHook(() => useFilterableSources([source as DataSource], http));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current![0]).toEqual(
      expect.objectContaining({ id: source.datasetId, title: 'mock', timeFieldName: '@timestamp' })
    );
    expect(result.current![0].fields.map(({ name }) => name)).toContain('bytes');
  });

  it('passes http to the source', async () => {
    const source = createEsqlSource();
    const toFilterableSource = jest.spyOn(source, 'toFilterableSource');

    renderHook(() => useFilterableSources([source], http));

    await waitFor(() => expect(toFilterableSource).toHaveBeenCalledWith(http));
  });

  it('keeps the same result when the caller passes a new array of the same sources', async () => {
    const source = createEsqlSource('@timestamp');
    const toFilterableSource = jest.spyOn(source, 'toFilterableSource');

    const { result, rerender } = renderHook(() => useFilterableSources([source], http));
    await waitFor(() => expect(result.current).toHaveLength(1));
    const first = result.current;
    rerender();
    rerender();

    expect(result.current).toBe(first);
    expect(toFilterableSource).toHaveBeenCalledTimes(1);
  });

  it('resolves again when the source changes', async () => {
    const first = createEsqlSource('@timestamp');
    const second = { ...createEsqlSource('event.ingested'), id: 'another-source' } as DataSource;

    const { result, rerender } = renderHook(
      ({ sources }: { sources: DataSource[] }) => useFilterableSources(sources, http),
      { initialProps: { sources: [first] as DataSource[] } }
    );
    await waitFor(() => expect(result.current![0].timeFieldName).toBe('@timestamp'));
    rerender({ sources: [second] });

    await waitFor(() => expect(result.current![0].timeFieldName).toBe('event.ingested'));
  });

  it('does not use the result of a source that was replaced before it resolved', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const first = createEsqlSource('@timestamp');
    first.toFilterableSource = jest.fn(
      () => new Promise((resolve) => (resolveFirst = resolve)) as never
    );
    const second = { ...createEsqlSource('event.ingested'), id: 'another-source' } as DataSource;

    const { result, rerender } = renderHook(
      ({ sources }: { sources: DataSource[] }) => useFilterableSources(sources, http),
      { initialProps: { sources: [first] as DataSource[] } }
    );
    rerender({ sources: [second] });
    await waitFor(() => expect(result.current![0].timeFieldName).toBe('event.ingested'));
    resolveFirst([{ id: 'stale', title: 'stale', fields: [], isTimeBased: () => false }]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current![0].timeFieldName).toBe('event.ingested');
  });
});
