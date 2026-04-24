/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { useHasLegacyActionMenu } from '../../shared/chrome_hooks';
import { HeaderActionMenu } from '../../shared/header_action_menu';
import { useAppHeaderMenu } from './hooks';

const AppMenuComponent = lazy(async () => {
  const { AppMenuComponent: Component } = await import('@kbn/core-chrome-app-menu-components');
  return { default: Component };
});

/** Fallback chain: AppMenuConfig + staticItems -> Legacy HeaderActionMenu -> nothing. */
export const AppMenu = React.memo(() => {
  const { config, staticItems } = useAppHeaderMenu();
  const hasLegacyActionMenu = useHasLegacyActionMenu();

  if (config) {
    return (
      <Suspense>
        <AppMenuComponent config={config} staticItems={staticItems} />
      </Suspense>
    );
  }

  if (hasLegacyActionMenu) {
    return <HeaderActionMenu />;
  }

  return null;
});

AppMenu.displayName = 'AppMenu';
