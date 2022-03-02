/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getUrlOrigin } from '@kbn/std';
import { resolve } from 'url';
import { IBasePath } from '../../http';
import { App, ParsedAppUrl } from '../types';

/**
 * Parse given URL and return the associated app id and path if any app matches, or undefined if none do.
 * Input can either be:
 *
 * - an absolute path containing the basePath,
 *   e.g `/base-path/app/my-app/some-path`
 *
 * - an absolute URL matching the `origin` of the Kibana instance (as seen by the browser),
 *   e.g `https://kibana:8080/base-path/app/my-app/some-path`
 *
 * - a path relative to the provided `currentUrl`.
 *   e.g with `currentUrl` being `https://kibana:8080/base-path/app/current-app/some-path`
 *   `../other-app/other-path` will be converted to `/base-path/app/other-app/other-path`
 */
export const parseAppUrl = (
  url: string,
  basePath: IBasePath,
  apps: Map<string, App<unknown>>,
  currentUrl: string = window.location.href
): ParsedAppUrl | undefined => {
  const currentOrigin = getUrlOrigin(currentUrl);
  if (!currentOrigin) {
    throw new Error('when manually provided, currentUrl must be valid url with an origin');
  }
  const currentPath = currentUrl.substring(currentOrigin.length);

  // remove the origin from the given url
  if (url.startsWith(currentOrigin)) {
    url = url.substring(currentOrigin.length);
  }

  // if the path is relative (i.e `../../to/somewhere`), we convert it to absolute
  if (!url.startsWith('/')) {
    url = resolve(currentPath, url);
  }

  // if using a basePath and the absolute path does not starts with it, it can't be a match
  const basePathValue = basePath.get();
  if (basePathValue && !url.startsWith(basePathValue)) {
    return undefined;
  }

  url = basePath.remove(url);
  if (!url.startsWith('/')) {
    return undefined;
  }

  for (const app of apps.values()) {
    const appPath = app.appRoute || `/app/${app.id}`;

    if (urlInApp(url, appPath)) {
      const path = url.substr(appPath.length);
      return {
        app: app.id,
        path: path.length ? path : undefined,
      };
    }
  }
};

const separators = ['/', '?', '#'];

const urlInApp = (url: string, appPath: string) => {
  if (url === appPath) {
    return true;
  }
  if (url.startsWith(appPath)) {
    const nextChar = url.substring(appPath.length, appPath.length + 1);
    return separators.includes(nextChar);
  }
  return false;
};
