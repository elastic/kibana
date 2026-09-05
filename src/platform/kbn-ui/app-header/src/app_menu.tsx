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
import type {
  AppMenuBeforePrimaryAction,
  AppMenuConfig,
  AppMenuStaticItem,
} from '@kbn/ui-app-menu';

const AppMenuComponentInternal = lazy(async () => {
  const { AppMenuComponentInternal: Component } = await import('@kbn/ui-app-menu');
  return { default: Component };
});

export interface AppMenuProps {
  menu?: AppMenuConfig;
  staticItems?: AppMenuStaticItem[];
  fallbackMenu?: ReactNode;
  /** Temporary Dashboard-only escape hatch. After visible secondary items, before More. Do not adopt. */
  beforePrimaryAction?: AppMenuBeforePrimaryAction;
}

export const AppMenu = React.memo<AppMenuProps>(
  ({ menu, staticItems, fallbackMenu, beforePrimaryAction }) => {
    const hasStaticItems = !!staticItems?.some((item) => !item.global);

    if (!menu && fallbackMenu) {
      return <>{fallbackMenu}</>;
    }

    if (menu || hasStaticItems || beforePrimaryAction) {
      return (
        <Suspense>
          <AppMenuComponentInternal
            config={menu}
            staticItems={staticItems}
            beforePrimaryAction={beforePrimaryAction}
          />
        </Suspense>
      );
    }

    return null;
  }
);

AppMenu.displayName = 'AppMenu';
