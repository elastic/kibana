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
 *  Creates a function that will be called on each route change
 *  to determine if the event should be used to update the last
 *  subUrl of chrome links/tabs
 *  @injected
 */
export function SubUrlRouteFilterProvider($injector) {
  if (!$injector.has('$route')) {
    return function alwaysUpdate() {
      return true;
    };
  }

  const $route = $injector.get('$route');
  return function ignoreRedirectToRoutes() {
    return Boolean($route.current && !$route.current.redirectTo);
  };
}
