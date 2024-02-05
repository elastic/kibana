/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type App,
  type AppDeepLink,
  type PublicAppInfo,
  type PublicAppDeepLinkInfo,
} from '@kbn/core-application-browser';

export function getAppInfo(app: App): PublicAppInfo {
  const { updater$, mount, ...infos } = app;
  return {
    ...infos,
    status: app.status!,
    // navLinkStatus:
    //   navLinkStatus === AppNavLinkStatus.default
    //     ? app.status === AppStatus.inaccessible
    //       ? AppNavLinkStatus.hidden
    //       : AppNavLinkStatus.visible
    //     : navLinkStatus,
    searchable: app.searchable ?? false,
    appRoute: app.appRoute!,
    keywords: app.keywords ?? [],
    deepLinks: getDeepLinkInfos(app.deepLinks),
  };
}

function getDeepLinkInfos(deepLinks?: AppDeepLink[]): PublicAppDeepLinkInfo[] {
  if (!deepLinks) return [];

  return deepLinks.map((deepLink): PublicAppDeepLinkInfo => {
    return {
      ...deepLink,
      keywords: deepLink.keywords ?? [],
      // navLinkStatus:
      //   navLinkStatus === AppNavLinkStatus.default ? AppNavLinkStatus.hidden : navLinkStatus,
      searchable: deepLink.searchable ?? false,
      deepLinks: getDeepLinkInfos(deepLink.deepLinks),
    };
  });
}
