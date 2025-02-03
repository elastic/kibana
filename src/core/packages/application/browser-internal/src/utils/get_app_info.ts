/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type App,
  AppStatus,
  type AppDeepLink,
  type PublicAppInfo,
  type PublicAppDeepLinkInfo,
} from '@kbn/core-application-browser';
import { DEFAULT_APP_VISIBILITY, DEFAULT_LINK_VISIBILITY } from './constants';

export function getAppInfo(app: App): PublicAppInfo {
  const { updater$, mount, visibleIn = DEFAULT_APP_VISIBILITY, ...infos } = app;
  return {
    ...infos,
    status: app.status ?? AppStatus.accessible,
    visibleIn: app.status === AppStatus.inaccessible ? [] : visibleIn,
    appRoute: app.appRoute!,
    keywords: app.keywords ?? [],
    deepLinks: app.status === AppStatus.inaccessible ? [] : getDeepLinkInfos(app.deepLinks),
  };
}

function getDeepLinkInfos(deepLinks?: AppDeepLink[]): PublicAppDeepLinkInfo[] {
  if (!deepLinks) return [];

  return deepLinks.map(
    ({ visibleIn = DEFAULT_LINK_VISIBILITY, ...rawDeepLink }): PublicAppDeepLinkInfo => {
      return {
        ...rawDeepLink,
        keywords: rawDeepLink.keywords ?? [],
        visibleIn,
        deepLinks: getDeepLinkInfos(rawDeepLink.deepLinks),
      };
    }
  );
}
