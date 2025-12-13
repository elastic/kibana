/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { TopNavMenuProps } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu_data';

const LazyTopNavMenu = lazy(async () => {
  const { TopNavMenu } = await import('./top_nav_menu');
  return { default: TopNavMenu };
});

/**
 * @deprecated
 */
export function createTopNav(
  /**
   * @deprecated AppMenu will decouple from UnifiedSearch, so this parameter
   * will be removed once AppMenu becomes the default.
   */
  unifiedSearch: UnifiedSearchPublicPluginStart,
  /**
   * @deprecated AppMenu will not allow for reigstering global menu items, so this parameter
   * will be removed once AppMenu becomes the default.
   */
  extraConfig: RegisteredTopNavMenuData[]
) {
  return <QT extends AggregateQuery | Query = Query>(props: TopNavMenuProps<QT>) => {
    const relevantConfig = extraConfig.filter(
      (dataItem) => dataItem.appName === undefined || dataItem.appName === props.appName
    );
    const config = (props.config || []).concat(relevantConfig);

    return (
      <I18nProvider>
        <Suspense>
          <LazyTopNavMenu
            {...(props as TopNavMenuProps<Query | AggregateQuery>)}
            unifiedSearch={unifiedSearch}
            config={config}
          />
        </Suspense>
      </I18nProvider>
    );
  };
}
