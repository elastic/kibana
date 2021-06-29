/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PublicAppInfo,
  AppNavLinkStatus,
  AppStatus,
  PublicAppDeepLinkInfo,
} from '../../application';
import { IBasePath } from '../../http';
import { NavLinkWrapper } from './nav_link';
import { appendAppPath } from '../../application/utils';

export function toNavLink(
  app: PublicAppInfo,
  basePath: IBasePath,
  deepLink?: PublicAppDeepLinkInfo
): NavLinkWrapper {
  const relativeBaseUrl = basePath.prepend(app.appRoute!);
  const url = appendAppPath(relativeBaseUrl, deepLink?.path || app.defaultPath);
  const href = relativeToAbsolute(url);
  const baseUrl = relativeToAbsolute(relativeBaseUrl);

  return new NavLinkWrapper({
    ...(deepLink || app),
    ...(app.category ? { category: app.category } : {}), // deepLinks use the main app category
    hidden: deepLink ? isDeepNavLinkHidden(deepLink) : isAppNavLinkHidden(app),
    disabled: (deepLink?.navLinkStatus ?? app.navLinkStatus) === AppNavLinkStatus.disabled,
    baseUrl,
    href,
    url,
  });
}

function isAppNavLinkHidden(app: PublicAppInfo) {
  return app.navLinkStatus === AppNavLinkStatus.default
    ? app.status === AppStatus.inaccessible
    : app.navLinkStatus === AppNavLinkStatus.hidden;
}

function isDeepNavLinkHidden(deepLink: PublicAppDeepLinkInfo) {
  return (
    deepLink.navLinkStatus === AppNavLinkStatus.default ||
    deepLink.navLinkStatus === AppNavLinkStatus.hidden
  );
}

/**
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
export function relativeToAbsolute(url: string) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}
