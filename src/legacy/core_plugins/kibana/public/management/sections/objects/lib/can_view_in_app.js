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

export function canViewInApp(uiCapabilities, type) {
  // ¯\_(ツ)_/¯
  // I don't quite understand why we're doing this "fuzziness", as
  // the types shouldn't differ or they won't conform to the mappings
  // of the .kibana index, but I'm emualating what's being done in "getInAppUrl"
  switch (type) {
    case 'search':
    case 'searches':
      return uiCapabilities.discover.show;
    case 'visualization':
    case 'visualizations':
      return uiCapabilities.visualize.show;
    case 'index-pattern':
    case 'index-patterns':
    case 'indexPatterns':
      return uiCapabilities.indexPatterns.show;
    case 'dashboard':
    case 'dashboards':
      return uiCapabilities.dashboard.show;
    default:
      return uiCapabilities[type].show;
  }
}
