/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RegisteredApplication } from '../../injected_metadata';
import { urlInApp } from './parse_app_url';

export const getMatchingRegisteredApp = ({
  currentPath,
  registeredApplications,
}: {
  currentPath: string;
  registeredApplications: RegisteredApplication[];
}): RegisteredApplication | undefined => {
  for (const app of registeredApplications) {
    const appPath = app.appRoute ?? `/app/${app.appId}`;
    if (urlInApp(currentPath, appPath)) {
      return app;
    }
  }
  return undefined;
};
