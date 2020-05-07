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

import { getOrigin, isLegacyApp } from './utils';
import { LegacyApp, App } from './types';
import { IBasePath } from '../http';

interface AppUrlInfo {
  app: string;
  path?: string;
}

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
  apps: Map<string, App<any> | LegacyApp>
): AppUrlInfo | undefined => {
  url = removeBasePath(url, basePath);
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

const removeBasePath = (url: string, basePath: IBasePath): string => {
  const origin = getOrigin();
  if (url.startsWith(origin)) {
    url = url.substring(origin.length);
  }
  return basePath.remove(url);
};
