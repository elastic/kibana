/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IBasePath } from '../http';
import { App, LegacyApp, PublicAppInfo, PublicLegacyAppInfo, ParsedAppUrl } from './types';

/**
 * Utility to remove trailing, leading or duplicate slashes.
 * By default will only remove duplicates.
 */
export const removeSlashes = (
  url: string,
  {
    trailing = false,
    leading = false,
    duplicates = true,
  }: { trailing?: boolean; leading?: boolean; duplicates?: boolean } = {}
): string => {
  if (duplicates) {
    url = url.replace(/\/{2,}/g, '/');
  }
  if (trailing) {
    url = url.replace(/\/$/, '');
  }
  if (leading) {
    url = url.replace(/^\//, '');
  }
  return url;
};

export const appendAppPath = (appBasePath: string, path: string = '') => {
  // Only prepend slash if not a hash or query path
  path = path === '' || path.startsWith('#') || path.startsWith('?') ? path : `/${path}`;
  // Do not remove trailing slash when in hashbang
  const removeTrailing = path.indexOf('#') === -1;
  return removeSlashes(`${appBasePath}${path}`, {
    trailing: removeTrailing,
    duplicates: true,
    leading: false,
  });
};

export function isLegacyApp(app: App | LegacyApp): app is LegacyApp {
  return app.legacy === true;
}

/**
 * Converts a relative path to an absolute url.
 * Implementation is based on a specified behavior of the browser to automatically convert
 * a relative url to an absolute one when setting the `href` attribute of a `<a>` html element.
 *
 * @example
 * ```ts
 * // current url: `https://kibana:8000/base-path/app/my-app`
 * relativeToAbsolute('/base-path/app/another-app') => `https://kibana:8000/base-path/app/another-app`
 * ```
 */
export const relativeToAbsolute = (url: string): string => {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
};

/**
 * Parse given url and return the associated app id and path if any app matches.
 * Input can either be:
 * - a path containing the basePath, ie `/base-path/app/my-app/some-path`
 * - an absolute url matching the `origin` of the kibana instance (as seen by the browser),
 *   i.e `https://kibana:8080/base-path/app/my-app/some-path`
 */
export const parseAppUrl = (
  url: string,
  basePath: IBasePath,
  apps: Map<string, App<unknown> | LegacyApp>,
  getOrigin: () => string = () => window.location.origin
): ParsedAppUrl | undefined => {
  url = removeBasePath(url, basePath, getOrigin());
  if (!url.startsWith('/')) {
    return undefined;
  }

  for (const app of apps.values()) {
    const appPath = isLegacyApp(app) ? app.appUrl : app.appRoute || `/app/${app.id}`;

    if (url.startsWith(appPath)) {
      const path = url.substr(appPath.length);
      return {
        app: app.id,
        path: path.length ? path : undefined,
      };
    }
  }
};

const removeBasePath = (url: string, basePath: IBasePath, origin: string): string => {
  if (url.startsWith(origin)) {
    url = url.substring(origin.length);
  }
  return basePath.remove(url);
};

export function getAppInfo(app: App<unknown> | LegacyApp): PublicAppInfo | PublicLegacyAppInfo {
  if (isLegacyApp(app)) {
    const { updater$, ...infos } = app;
    return {
      ...infos,
      status: app.status!,
      navLinkStatus: app.navLinkStatus!,
      legacy: true,
    };
  } else {
    const { updater$, mount, ...infos } = app;
    return {
      ...infos,
      status: app.status!,
      navLinkStatus: app.navLinkStatus!,
      appRoute: app.appRoute!,
      legacy: false,
    };
  }
}
