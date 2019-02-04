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

import { IconType } from '@elastic/eui';
import * as Rx from 'rxjs';

import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';

export interface NavLink {
  title: string;
  url: string;
  subUrlBase: string;
  id: string;
  euiIconType: IconType;
  active: boolean;
  lastSubUrl?: string;
  hidden?: boolean;
  disabled?: boolean;
}

export interface ChromeNavLinks {
  getNavLinks$(): Rx.Observable<NavLink>;
  getNavLinks(): NavLink[];
  navLinkExists(id: string): boolean;
  getNavLinkById(id: string): NavLink;
  showOnlyById(id: string): void;
  untrackNavLinksForDeletedSavedObjects(deletedIds: string[]): void;
  trackSubUrlForApp(linkId: string, parsedKibanaUrl: KibanaParsedUrl): void;
  enableForcedAppSwitcherNavigation(): this;
  getForcedAppSwitcherNavigation$(): Rx.Observable<boolean>;
}
