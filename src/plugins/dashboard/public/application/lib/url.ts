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
 * Returns dashboard id from URL
 * literally looks from id after `dashboard/` string and before `/`, `?` and end of string
 * @param url to extract dashboardId from
 * input: http://localhost:5601/lib/app/kibana#/dashboard?param1=x&param2=y&param3=z
 * output: undefined
 * input: http://localhost:5601/lib/app/kibana#/dashboard/39292992?param1=x&param2=y&param3=z
 * output: 39292992
 */
export function getDashboardIdFromUrl(url: string): string | undefined {
  const [, dashboardId] = url.match(/view\/(.*?)(\/|\?|$)/) ?? [
    undefined, // full match
    undefined, // group with dashboardId
  ];
  return dashboardId ?? undefined;
}
