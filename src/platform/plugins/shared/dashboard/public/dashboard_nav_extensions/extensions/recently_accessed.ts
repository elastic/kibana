/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { map, type Observable } from 'rxjs';
import type { ChromeRecentlyAccessed, IBasePath } from '@kbn/core/public';
import type { NavExtensionEntry } from '@kbn/core-chrome-browser';
import type { DashboardNavExtension } from '../types';

export interface RecentDashboardRow {
  id: string;
  label: string;
  href: string;
}

export const RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID = 'recentlyAccessedDashboards' as const;

declare module '@kbn/core-chrome-browser' {
  interface NavExtensionRegistry {
    [RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID]: NavExtensionEntry<RecentDashboardRow[]>;
  }
}

const DEFAULT_MAX_RECENT_ITEMS = 5;

export const createRecentItemsData$ = (
  recentlyAccessed: Pick<ChromeRecentlyAccessed, 'get$'>,
  basePath: Pick<IBasePath, 'prepend'>,
  { max = DEFAULT_MAX_RECENT_ITEMS }: { max?: number } = {}
): Observable<RecentDashboardRow[]> => {
  const filterPattern = new RegExp(String.raw`\/app\/dashboards`);

  return recentlyAccessed.get$().pipe(
    map((items) =>
      items
        .filter((item) => filterPattern.test(item.link))
        .slice(0, max)
        .map((item) => ({
          id: `recent-${item.id}`,
          label: item.label,
          href: basePath.prepend(item.link),
        }))
    )
  );
};

export const recentlyAccessedExtension: DashboardNavExtension<
  typeof RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID
> = {
  definition: {
    id: RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID,
    templateId: 'list',
    config: {
      max: DEFAULT_MAX_RECENT_ITEMS,
      heading: i18n.translate('dashboard.navExtensions.recentlyAccessed.heading', {
        defaultMessage: 'Recently viewed Dashboards',
      }),
    },
  },
  createData$: (core) => createRecentItemsData$(core.chrome.recentlyAccessed, core.http.basePath),
};

export const recentlyAccessedNavExtensionDefinition = recentlyAccessedExtension.definition;
