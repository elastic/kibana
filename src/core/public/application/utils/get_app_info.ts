/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  App,
  AppNavLinkStatus,
  AppStatus,
  AppSearchDeepLink,
  PublicAppInfo,
  PublicAppSearchDeepLinkInfo,
} from '../types';

export function getAppInfo(app: App): PublicAppInfo {
  const navLinkStatus =
    app.navLinkStatus === AppNavLinkStatus.default
      ? app.status === AppStatus.inaccessible
        ? AppNavLinkStatus.hidden
        : AppNavLinkStatus.visible
      : app.navLinkStatus!;
  const { updater$, mount, ...infos } = app;
  return {
    ...infos,
    status: app.status!,
    navLinkStatus,
    appRoute: app.appRoute!,
    meta: {
      keywords: app.meta?.keywords ?? [],
      searchDeepLinks: getSearchDeepLinkInfos(app, app.meta?.searchDeepLinks),
    },
  };
}

function getSearchDeepLinkInfos(
  app: App,
  searchDeepLinks?: AppSearchDeepLink[]
): PublicAppSearchDeepLinkInfo[] {
  if (!searchDeepLinks) {
    return [];
  }

  return searchDeepLinks.map(
    (rawDeepLink): PublicAppSearchDeepLinkInfo => {
      return {
        id: rawDeepLink.id,
        title: rawDeepLink.title,
        path: rawDeepLink.path,
        keywords: rawDeepLink.keywords ?? [],
        searchDeepLinks: getSearchDeepLinkInfos(app, rawDeepLink.searchDeepLinks),
      };
    }
  );
}
