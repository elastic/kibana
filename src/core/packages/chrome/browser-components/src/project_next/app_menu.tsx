/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { useHasLegacyActionMenu } from '../shared/chrome_hooks';
import { HeaderActionMenu } from '../shared/header_action_menu';
import { useProjectNextAppMenu } from './hooks';

const AppMenuComponent = lazy(async () => {
  const { AppMenuComponent: Component } = await import('@kbn/core-chrome-app-menu-components');
  return { default: Component };
});

/**
 * Renders the app menu for the Chrome-Next project header.
 * Fallback chain: merged AppMenuConfig -> legacy HeaderActionMenu -> nothing.
 */
export const ProjectNextAppMenu = React.memo(() => {
  const appMenuConfig = useProjectNextAppMenu();
  const hasLegacyActionMenu = useHasLegacyActionMenu();

  if (appMenuConfig) {
    return (
      <Suspense>
        <AppMenuComponent config={appMenuConfig} />
      </Suspense>
    );
  }

  if (hasLegacyActionMenu) {
    return <HeaderActionMenu />;
  }

  return null;
});

ProjectNextAppMenu.displayName = 'ProjectNextAppMenu';
