/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import {
  createRecentItemsData$,
  RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID,
  recentlyAccessedExtension,
  recentlyAccessedNavExtensionDefinition,
} from './recently_accessed';

const recentlyAccessed = getDashboardRecentlyAccessedService();

const setRecentlyAccessedItems = (items: RecentlyAccessedHistoryItem[]) => {
  recentlyAccessed.get$ = jest.fn().mockReturnValue(new BehaviorSubject(items));
};

const createBasePathMock = (basePath = '/s/default') => ({
  prepend: jest.fn((path: string) => `${basePath}${path}`),
});

describe('recentlyAccessedExtension', () => {
  it('registers the recently accessed dashboards list extension', () => {
    expect(recentlyAccessedNavExtensionDefinition).toEqual(recentlyAccessedExtension.definition);
    expect(recentlyAccessedNavExtensionDefinition).toMatchObject({
      id: RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID,
      templateId: 'list',
      config: {
        max: 5,
        heading: 'Recently viewed Dashboards',
      },
    });
  });
});

describe('createRecentItemsData$', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRecentlyAccessedItems([]);
  });

  it('maps recently accessed dashboard items to recent item rows', async () => {
    setRecentlyAccessedItems([
      { id: 'dash-1', label: 'Sales overview', link: '/app/dashboards#/view/dash-1' },
      { id: 'dash-2', label: 'Ops metrics', link: '/app/dashboards#/view/dash-2' },
    ]);
    const basePath = createBasePathMock();

    const result = await firstValueFrom(createRecentItemsData$(basePath));

    expect(result).toEqual([
      {
        id: 'recent-dash-1',
        label: 'Sales overview',
        href: '/s/default/app/dashboards#/view/dash-1',
      },
      {
        id: 'recent-dash-2',
        label: 'Ops metrics',
        href: '/s/default/app/dashboards#/view/dash-2',
      },
    ]);
    expect(basePath.prepend).toHaveBeenCalledWith('/app/dashboards#/view/dash-1');
    expect(basePath.prepend).toHaveBeenCalledWith('/app/dashboards#/view/dash-2');
  });

  it('caps the number of items using the default max', async () => {
    setRecentlyAccessedItems(
      Array.from({ length: 7 }, (_, index) => ({
        id: `dash-${index}`,
        label: `Dashboard ${index}`,
        link: `/app/dashboards#/view/dash-${index}`,
      }))
    );
    const basePath = createBasePathMock();

    const result = await firstValueFrom(createRecentItemsData$(basePath));

    expect(result).toHaveLength(5);
    expect(result[0]?.id).toBe('recent-dash-0');
    expect(result[4]?.id).toBe('recent-dash-4');
  });

  it('respects a custom max', async () => {
    setRecentlyAccessedItems([
      { id: 'dash-1', label: 'Sales overview', link: '/app/dashboards#/view/dash-1' },
      { id: 'dash-2', label: 'Ops metrics', link: '/app/dashboards#/view/dash-2' },
    ]);
    const basePath = createBasePathMock('/base');

    const result = await firstValueFrom(
      createRecentItemsData$(basePath, {
        max: 1,
      })
    );

    expect(result).toEqual([
      {
        id: 'recent-dash-1',
        label: 'Sales overview',
        href: '/base/app/dashboards#/view/dash-1',
      },
    ]);
  });

  it('emits an empty array when there are no items', async () => {
    const basePath = createBasePathMock();

    const result = await firstValueFrom(createRecentItemsData$(basePath));

    expect(result).toEqual([]);
  });

  it('emits updated rows when recently accessed history changes', async () => {
    const history$ = new BehaviorSubject<RecentlyAccessedHistoryItem[]>([
      { id: 'dash-1', label: 'Sales overview', link: '/app/dashboards#/view/dash-1' },
    ]);
    recentlyAccessed.get$ = jest.fn().mockReturnValue(history$);
    const basePath = createBasePathMock();
    const recentItemsData$ = createRecentItemsData$(basePath);

    expect(await firstValueFrom(recentItemsData$)).toEqual([
      {
        id: 'recent-dash-1',
        label: 'Sales overview',
        href: '/s/default/app/dashboards#/view/dash-1',
      },
    ]);

    history$.next([{ id: 'dash-2', label: 'Ops metrics', link: '/app/dashboards#/view/dash-2' }]);

    expect(await firstValueFrom(recentItemsData$)).toEqual([
      {
        id: 'recent-dash-2',
        label: 'Ops metrics',
        href: '/s/default/app/dashboards#/view/dash-2',
      },
    ]);
  });
});
