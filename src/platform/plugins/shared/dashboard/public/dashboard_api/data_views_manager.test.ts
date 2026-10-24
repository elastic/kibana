/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FilterableSource } from '@kbn/data-source';
import { initializeDataViewsManager } from './data_views_manager';

const dataView = (id: string) => ({ id, title: id, fields: [] } as unknown as DataView);
const source = (id: string): FilterableSource => ({
  id,
  title: id,
  fields: [],
  isTimeBased: () => true,
});

const setup = (children: Record<string, Record<string, unknown>>) => {
  const children$ = new BehaviorSubject(
    children as unknown as { [key: string]: DefaultEmbeddableApi }
  );
  return { children$, ...initializeDataViewsManager(children$) };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const ids = (list?: Array<{ id?: string }>) => list?.map(({ id }) => id);

describe('initializeDataViewsManager', () => {
  it('publishes the data views of the children as data views and as filterable sources', async () => {
    const { api } = setup({ a: { dataViews$: new BehaviorSubject([dataView('dv-1')]) } });

    await flush();

    expect(ids(api.dataViews$.value)).toEqual(['dv-1']);
    expect(ids(api.filterableSources$.value)).toEqual(['dv-1']);
  });

  it('publishes the filterable sources of the children without turning them into data views', async () => {
    const { api } = setup({ a: { filterableSources$: new BehaviorSubject([source('esql-1')]) } });

    await flush();

    expect(api.dataViews$.value).toEqual([]);
    expect(ids(api.filterableSources$.value)).toEqual(['esql-1']);
  });

  it('merges both lists and removes duplicated ids', async () => {
    const { api } = setup({
      a: { dataViews$: new BehaviorSubject([dataView('dv-1'), dataView('shared')]) },
      b: { filterableSources$: new BehaviorSubject([source('shared'), source('esql-1')]) },
    });

    await flush();

    expect(ids(api.filterableSources$.value)).toEqual(['dv-1', 'shared', 'esql-1']);
  });

  it('follows the children when they change', async () => {
    const published$ = new BehaviorSubject([source('esql-1')]);
    const { api } = setup({ a: { filterableSources$: published$ } });
    await flush();

    published$.next([source('esql-2')]);
    await flush();

    expect(ids(api.filterableSources$.value)).toEqual(['esql-2']);
  });

  it('updates both lists in the same tick, so they never disagree', async () => {
    const { api, children$ } = setup({});
    const seen: Array<{
      dataViews?: Array<string | undefined>;
      sources?: Array<string | undefined>;
    }> = [];
    api.filterableSources$.subscribe((sources) =>
      seen.push({ dataViews: ids(api.dataViews$.value), sources: ids(sources) })
    );

    children$.next({
      a: { dataViews$: new BehaviorSubject([dataView('dv-1')]) },
    } as never);
    await flush();

    expect(seen[seen.length - 1]).toEqual({ dataViews: ['dv-1'], sources: ['dv-1'] });
    expect(seen.filter(({ sources }) => sources?.length === 1)).toEqual([
      { dataViews: ['dv-1'], sources: ['dv-1'] },
    ]);
  });
});
