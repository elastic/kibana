/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useAppMenu } from './chrome_hooks';

const AppMenu = lazy(async () => {
  const { AppMenuComponent } = await import('@kbn/core-chrome-app-menu-components');
  return { default: AppMenuComponent };
});

export const HeaderAppMenu = () => {
  const menuConfig = useAppMenu();
  const chrome = useChromeService();
  const staticItems = useObservable(chrome.getAppMenuStaticItems$(), []);

  if (!menuConfig && staticItems.length === 0) {
    return null;
  }

  return (
    <Suspense>
      <AppMenu config={menuConfig} staticItems={staticItems} />
    </Suspense>
  );
};
