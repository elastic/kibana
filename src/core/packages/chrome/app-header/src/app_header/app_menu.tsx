/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { hasNonGlobalStaticItems, type AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useHasLegacyActionMenu } from './hooks/chrome';
import { LegacyHeaderActionMenu } from './legacy_action_menu';
import { useAppHeaderStaticItems } from './hooks';

const AppMenuComponent = lazy(async () => {
  const { AppMenuComponent: Component } = await import('@kbn/core-chrome-app-menu-components');
  return { default: Component };
});

export interface AppMenuProps {
  menu?: AppMenuConfig & { isCollapsed?: boolean };
  docLink?: string;
  showAddIntegrations?: boolean;
}

export const AppMenu = React.memo<AppMenuProps>(({ menu, docLink, showAddIntegrations }) => {
  const staticItems = useAppHeaderStaticItems({ docLink, showAddIntegrations });
  const hasLegacyActionMenu = useHasLegacyActionMenu();
  const hasStaticItems = hasNonGlobalStaticItems(staticItems);

  if (!menu && hasLegacyActionMenu) {
    return <LegacyHeaderActionMenu />;
  }

  if (menu || hasStaticItems) {
    return (
      <Suspense>
        <AppMenuComponent
          config={menu}
          staticItems={staticItems}
          isCollapsed={menu?.isCollapsed ?? false}
        />
      </Suspense>
    );
  }

  return null;
});

AppMenu.displayName = 'AppMenu';
