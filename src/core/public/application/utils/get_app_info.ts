/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  App,
  AppNavLinkStatus,
  AppStatus,
  AppDeepLink,
  PublicAppInfo,
  PublicAppDeepLinkInfo,
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
    keywords: app.keywords ?? [],
    deepLinks: getDeepLinkInfos(app.deepLinks),
  };
}

function getDeepLinkInfos(deepLinks?: AppDeepLink[]): PublicAppDeepLinkInfo[] {
  if (!deepLinks) return [];

  return deepLinks.map(
    (rawDeepLink): PublicAppDeepLinkInfo => {
      const navLinkStatus =
        rawDeepLink.navLinkStatus === AppNavLinkStatus.default
          ? AppNavLinkStatus.hidden
          : rawDeepLink.navLinkStatus!;
      return {
        id: rawDeepLink.id,
        title: rawDeepLink.title,
        path: rawDeepLink.path,
        keywords: rawDeepLink.keywords ?? [],
        navLinkStatus,
        deepLinks: getDeepLinkInfos(rawDeepLink.deepLinks),
      };
    }
  );
}
