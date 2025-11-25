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
import type { TopNavMenuPropsBeta } from '../top_nav_menu_beta/top_nav_menu_beta';
import type { TopNavMenuProps } from './top_nav_menu';
import type { RegisteredTopNavMenuData, RegisteredTopNavMenuDataBeta } from './top_nav_menu_data';

const LazyTopNavMenu = lazy(async () => {
  const { TopNavMenu } = await import('./top_nav_menu');
  return { default: TopNavMenu };
});

const LazyTopNavMenuBeta = lazy(async () => {
  const { TopNavMenuBeta } = await import('../top_nav_menu_beta/top_nav_menu_beta');
  return { default: TopNavMenuBeta };
});

export function createTopNav(
  unifiedSearch: UnifiedSearchPublicPluginStart,
  extraConfig: RegisteredTopNavMenuData[] | RegisteredTopNavMenuDataBeta[],
  isBeta?: boolean
) {
  return <QT extends AggregateQuery | Query = Query>(
    props: TopNavMenuProps<QT> | TopNavMenuPropsBeta<QT>
  ) => {
    const relevantConfig = extraConfig.filter(
      (dataItem) => dataItem.appName === undefined || dataItem.appName === props.appName
    );

    const TopNavMenuComponent = isBeta ? (
      <Suspense>
        <LazyTopNavMenuBeta
          {...(props as any)}
          unifiedSearch={unifiedSearch}
          config={
            props.config
              ? {
                  items: [
                    ...(props.config as TopNavMenuPropsBeta<QT>['config'])!.items,
                    ...relevantConfig,
                  ],
                  primaryActionItem: (props.config as TopNavMenuPropsBeta<QT>['config'])!
                    .primaryActionItem,
                  secondaryActionItem: (props.config as TopNavMenuPropsBeta<QT>['config'])!
                    .secondaryActionItem,
                }
              : { items: relevantConfig }
          }
        />
      </Suspense>
    ) : (
      <Suspense>
        <LazyTopNavMenu
          {...(props as any)}
          unifiedSearch={unifiedSearch}
          config={((props.config as TopNavMenuProps<QT>['config']) || []).concat(relevantConfig)}
        />
      </Suspense>
    );

    return <I18nProvider>{TopNavMenuComponent}</I18nProvider>;
  };
}
