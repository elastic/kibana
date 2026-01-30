/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';

export const getCurrentAppTitle = (application: ApplicationStart) => {
  let appTitle: string | undefined;
  let currentAppId: string | undefined = '';

  const appIdSubscription = application.currentAppId$.subscribe((id) => {
    currentAppId = id;
  });

  const appsSubscription = application.applications$.subscribe((apps) => {
    const currentApp = currentAppId ? apps.get(currentAppId) : undefined;
    appTitle = currentApp?.title;
  });

  appIdSubscription.unsubscribe();
  appsSubscription.unsubscribe();

  return appTitle;
};
