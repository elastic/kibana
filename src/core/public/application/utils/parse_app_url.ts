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

import { IBasePath } from '../../http';
import { App, ParsedAppUrl } from '../types';

/**
 * Parse given url and return the associated app id and path if any app matches, or undefined if none do.
 * Input can either be:
 *
 * - a path containing the basePath,
 *   ie `/base-path/app/my-app/some-path`
 *
 * - an absolute url matching the `origin` of the kibana instance (as seen by the browser),
 *   i.e `https://kibana:8080/base-path/app/my-app/some-path`
 */
export const parseAppUrl = (
  url: string,
  basePath: IBasePath,
  apps: Map<string, App<unknown>>,
  getOrigin: () => string = () => window.location.origin
): ParsedAppUrl | undefined => {
  const origin = getOrigin();

  // remove the origin from the given url
  if (url.startsWith(origin)) {
    url = url.substring(origin.length);
  }
  // if using a basePath and the url path does not starts with it
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

    if (url.startsWith(appPath)) {
      const path = url.substr(appPath.length);
      return {
        app: app.id,
        path: path.length ? path : undefined,
      };
    }
  }
};
