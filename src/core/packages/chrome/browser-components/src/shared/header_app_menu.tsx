/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useChromeComponentsDeps } from '../context';

const AppMenu = lazy(async () => {
  const { AppMenuComponent } = await import('@kbn/core-chrome-app-menu-components');
  return { default: AppMenuComponent };
});

export const HeaderAppMenu = () => {
  const { appMenu$ } = useChromeComponentsDeps();
  const menuConfig = useObservable(appMenu$, undefined);

  if (menuConfig) {
    return (
      <Suspense>
        <AppMenu config={menuConfig} />
      </Suspense>
    );
  }
};
