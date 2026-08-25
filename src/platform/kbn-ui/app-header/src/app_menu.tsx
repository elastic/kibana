/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense } from 'react';
import type { AppMenuConfig, AppMenuStaticItem } from '@kbn/ui-app-menu';

const AppMenuComponent = lazy(async () => {
  const { AppMenuComponent: Component } = await import('@kbn/ui-app-menu');
  return { default: Component };
});

export interface AppMenuProps {
  menu?: AppMenuConfig;
  staticItems?: AppMenuStaticItem[];
  fallbackMenu?: ReactNode;
}

export const AppMenu = React.memo<AppMenuProps>(({ menu, staticItems, fallbackMenu }) => {
  const hasStaticItems = !!staticItems?.some((item) => !item.global);

  if (!menu && fallbackMenu) {
    return <>{fallbackMenu}</>;
  }

  if (menu || hasStaticItems) {
    return (
      <Suspense>
        <AppMenuComponent config={menu} staticItems={staticItems} />
      </Suspense>
    );
  }

  return null;
});

AppMenu.displayName = 'AppMenu';
