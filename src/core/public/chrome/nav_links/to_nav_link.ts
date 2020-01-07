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

import { App, AppNavLinkStatus, AppStatus, LegacyApp } from '../../application';
import { IBasePath } from '../../http';
import { NavLinkWrapper } from './nav_link';

export function toNavLink(app: App | LegacyApp, basePath: IBasePath): NavLinkWrapper {
  const useAppStatus =
    app.navLinkStatus === AppNavLinkStatus.default || app.navLinkStatus === undefined;
  return new NavLinkWrapper({
    ...app,
    hidden: useAppStatus
      ? app.status === AppStatus.inaccessible
      : app.navLinkStatus === AppNavLinkStatus.hidden,
    disabled: useAppStatus ? false : app.navLinkStatus === AppNavLinkStatus.disabled,
    legacy: isLegacyApp(app),
    baseUrl: isLegacyApp(app)
      ? relativeToAbsolute(basePath.prepend(app.appUrl))
      : relativeToAbsolute(basePath.prepend(app.appRoute || `/app/${app.id}`)),
  });
}

function relativeToAbsolute(url: string) {
  // convert all link urls to absolute urls
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

function isLegacyApp(app: App | LegacyApp): app is LegacyApp {
  return app.legacy === true;
}
