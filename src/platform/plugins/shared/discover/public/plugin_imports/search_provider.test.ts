/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NEVER, lastValueFrom } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { getESQLSearchProvider } from './search_provider';
import { createDiscoverDataViewsMock } from '../__mocks__/data_views';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverStartPlugins } from '../types';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

describe('ES|QL search provider', () => {
  const getServices = (): Promise<[CoreStart, DiscoverStartPlugins]> =>
    Promise.resolve([
      {
        application: { capabilities: { navLinks: { discover: true } } },
      } as unknown as CoreStart,
      { dataViews: createDiscoverDataViewsMock() } as unknown as DiscoverStartPlugins,
    ]);
  const locator = {
    useUrl: jest.fn(() => ''),
    navigate: jest.fn(),
    getLocation: jest.fn(() =>
      Promise.resolve({
        app: 'discover',
        path: '/test',
      })
    ),
    getRedirectUrl: jest.fn(() => ''),
  } as unknown as DiscoverAppLocator;
  test('returns score 100 if term is esql', async () => {
    const esqlSearchProvider = getESQLSearchProvider({
      isESQLEnabled: true,
      locator,
      getServices,
    });
    const observable = esqlSearchProvider.find(
      { term: 'esql' },
      { aborted$: NEVER, maxResults: 100, preference: '' }
    );

    await expect(lastValueFrom(observable)).resolves.toEqual([
      {
        icon: 'logoKibana',
        id: 'esql',
        meta: { categoryId: 'kibana', categoryLabel: 'Analytics' },
        score: 100,
        title: 'Create ES|QL queries',
        type: 'application',
        url: '/app/discover/test',
      },
    ]);
  });

  test('returns score 90 if user tries to write es|ql', async () => {
    const esqlSearchProvider = getESQLSearchProvider({
      isESQLEnabled: true,
      locator,
      getServices,
    });
    const observable = esqlSearchProvider.find(
      { term: 'es|' },
      { aborted$: NEVER, maxResults: 100, preference: '' }
    );

    await expect(lastValueFrom(observable)).resolves.toEqual([
      {
        icon: 'logoKibana',
        id: 'esql',
        meta: { categoryId: 'kibana', categoryLabel: 'Analytics' },
        score: 90,
        title: 'Create ES|QL queries',
        type: 'application',
        url: '/app/discover/test',
      },
    ]);
  });

  test('returns empty results if user tries to write something irrelevant', async () => {
    const esqlSearchProvider = getESQLSearchProvider({
      isESQLEnabled: true,
      locator,
      getServices,
    });
    const observable = esqlSearchProvider.find(
      { term: 'woof' },
      { aborted$: NEVER, maxResults: 100, preference: '' }
    );

    await expect(lastValueFrom(observable)).resolves.toEqual([]);
  });

  test('returns empty results if ESQL is disabled', async () => {
    const esqlSearchProvider = getESQLSearchProvider({
      isESQLEnabled: false,
      locator,
      getServices,
    });
    const observable = esqlSearchProvider.find(
      { term: 'esql' },
      { aborted$: NEVER, maxResults: 100, preference: '' }
    );

    await expect(lastValueFrom(observable)).resolves.toEqual([]);
  });

  test('returns empty results if no default dataview', async () => {
    const dataViewMock = createDiscoverDataViewsMock();
    const esqlSearchProvider = getESQLSearchProvider({
      isESQLEnabled: true,
      locator,
      getServices: async () => {
        const [core, start] = await getServices();
        start.dataViews = {
          ...dataViewMock,
          getDefaultDataView: jest.fn(() => undefined),
        } as unknown as DataViewsServicePublic;
        return [core, start];
      },
    });
    const observable = esqlSearchProvider.find(
      { term: 'woof' },
      { aborted$: NEVER, maxResults: 100, preference: '' }
    );

    await expect(lastValueFrom(observable)).resolves.toEqual([]);
  });
});
