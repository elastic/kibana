/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type App,
  AppStatus,
  type AppDeepLink,
  type PublicAppInfo,
  type PublicAppDeepLinkInfo,
  type AppDeepLinkLocations,
} from '@kbn/core-application-browser';

export const linkVisibleEverywhere: AppDeepLinkLocations[] = ['globalSearch', 'sideNav'];

export function getAppInfo(app: App): PublicAppInfo {
  const { updater$, mount, visibleIn = linkVisibleEverywhere, ...infos } = app;
  return {
    ...infos,
    status: app.status ?? AppStatus.accessible,
    visibleIn: app.status === AppStatus.inaccessible ? [] : visibleIn,
    appRoute: app.appRoute!,
    keywords: app.keywords ?? [],
    deepLinks: getDeepLinkInfos(app.deepLinks),
  };
}

function getDeepLinkInfos(deepLinks?: AppDeepLink[]): PublicAppDeepLinkInfo[] {
  if (!deepLinks) return [];

  return deepLinks.map(
    ({ visibleIn = ['globalSearch'], ...rawDeepLink }): PublicAppDeepLinkInfo => {
      return {
        ...rawDeepLink,
        keywords: rawDeepLink.keywords ?? [],
        visibleIn,
        deepLinks: getDeepLinkInfos(rawDeepLink.deepLinks),
      };
    }
  );
}
