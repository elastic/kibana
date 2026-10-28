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
  it('publishes the data sources of the children, whether they are data views or ES|QL datasets', async () => {
    const { api } = setup({
      a: { dataSources$: new BehaviorSubject([dataView('dv-1')]) },
      b: { dataSources$: new BehaviorSubject([source('esql-1')]) },
    });

    await flush();

    expect(ids(api.dataSources$.value)).toEqual(['dv-1', 'esql-1']);
  });

  it('removes duplicated ids across children', async () => {
    const { api } = setup({
      a: { dataSources$: new BehaviorSubject([dataView('shared'), dataView('dv-1')]) },
      b: { dataSources$: new BehaviorSubject([source('shared'), source('esql-1')]) },
    });

    await flush();

    expect(ids(api.dataSources$.value)).toEqual(['shared', 'dv-1', 'esql-1']);
  });

  it('ignores children that do not publish data sources', async () => {
    const { api } = setup({ a: {}, b: { dataSources$: new BehaviorSubject([source('esql-1')]) } });

    await flush();

    expect(ids(api.dataSources$.value)).toEqual(['esql-1']);
  });

  it('publishes an empty list when there are no children', async () => {
    const { api } = setup({});

    await flush();

    expect(api.dataSources$.value).toEqual([]);
  });

  it('follows the children when they change', async () => {
    const published$ = new BehaviorSubject([source('esql-1')]);
    const { api, children$ } = setup({ a: { dataSources$: published$ } });
    await flush();

    published$.next([source('esql-2')]);
    await flush();
    expect(ids(api.dataSources$.value)).toEqual(['esql-2']);

    children$.next({} as never);
    await flush();
    expect(api.dataSources$.value).toEqual([]);
  });
});
