/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBasePath } from '@kbn/core-http-browser';
import {
  type PublicAppInfo,
  type PublicAppDeepLinkInfo,
  AppStatus,
} from '@kbn/core-application-browser';
import { appendAppPath } from '@kbn/core-application-browser-internal';
import { NavLinkWrapper } from './nav_link';

export function toNavLink(
  app: PublicAppInfo,
  basePath: IBasePath,
  deepLink?: PublicAppDeepLinkInfo
): NavLinkWrapper | null {
  const relativeBaseUrl = basePath.prepend(app.appRoute!);
  const url = appendAppPath(relativeBaseUrl, deepLink?.path || app.defaultPath);
  const href = relativeToAbsolute(url);
  const baseUrl = relativeToAbsolute(relativeBaseUrl);

  if (app.status === AppStatus.inaccessible) return null;

  return new NavLinkWrapper({
    ...(deepLink || app),
    ...(app.category ? { category: app.category } : {}), // deepLinks use the main app category
    baseUrl,
    href,
    url,
  });
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
