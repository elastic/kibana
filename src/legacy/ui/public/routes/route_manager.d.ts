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

/**
 * WARNING: these types are incomplete
 */

import { ChromeBreadcrumb } from '../../../../core/public';

export interface RouteConfiguration {
  controller?: string | ((...args: any[]) => void);
  redirectTo?: string;
  resolveRedirectTo?: (...args: any[]) => void;
  reloadOnSearch?: boolean;
  reloadOnUrl?: boolean;
  outerAngularWrapperRoute?: boolean;
  resolve?: object;
  template?: string;
  k7Breadcrumbs?: (...args: any[]) => ChromeBreadcrumb[];
  requireUICapability?: string;
}

interface RouteManager {
  addSetupWork(cb: (...args: any[]) => void): void;
  when(path: string, routeConfiguration: RouteConfiguration): RouteManager;
  otherwise(routeConfiguration: RouteConfiguration): RouteManager;
  defaults(path: string | RegExp, defaults: RouteConfiguration): RouteManager;
}

// eslint-disable-next-line import/no-default-export
export default RouteManager;
