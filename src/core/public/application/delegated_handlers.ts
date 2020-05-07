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

import { App, ApplicationStart, LegacyApp } from './types';
import { isModifiedEvent, selfOrParentMatch } from './utils';
import { parseAppUrl } from './parse_app_url';
import { IBasePath } from '../http';

export type DelegatedClickEvent = MouseEvent & { currentTarget: Element };
export type DelegatedClickEventHandler = (event: DelegatedClickEvent) => void;

export const disableCoreNavAttribute = 'data-disable-core-navigation';

const hasDisableAttribute = (el: HTMLElement) =>
  el.hasAttribute(disableCoreNavAttribute) && el.getAttribute(disableCoreNavAttribute) !== 'false';

export const createCrossAppLinkClickHandler = ({
  navigateToApp,
  basePath,
  apps,
  getCurrentAppId,
}: {
  navigateToApp: ApplicationStart['navigateToApp'];
  basePath: IBasePath;
  apps: Map<string, App<unknown> | LegacyApp>;
  getCurrentAppId: () => string | undefined;
}): DelegatedClickEventHandler => {
  return (e: DelegatedClickEvent) => {
    const link = e.currentTarget as HTMLAnchorElement;
    if (
      link.href && // ignore links with empty hrefs
      (link.target === '' || link.target === 'self') && // ignore links having a target
      !selfOrParentMatch(link, hasDisableAttribute) && // ignore explicitly ignored links
      e.button === 0 && // ignore everything but left clicks
      !e.defaultPrevented && // ignore default prevented events
      !isModifiedEvent(e) // ignore clicks with modifier keys
    ) {
      const appInfo = parseAppUrl(link.href, basePath, apps);
      if (appInfo && appInfo.app !== getCurrentAppId()) {
        e.preventDefault();
        navigateToApp(appInfo.app, { path: appInfo.path });
      }
    }
  };
};
