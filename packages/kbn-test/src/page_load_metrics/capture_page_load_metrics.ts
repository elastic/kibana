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

import { ToolingLog } from '@kbn/dev-utils';
import { NavigationOptions, createUrl, navigateToApps } from './navigation';

export async function capturePageLoadMetrics(log: ToolingLog, options: NavigationOptions) {
  const responsesByPageView = await navigateToApps(log, options);

  const assetSizeMeasurements = new Map<string, number[]>();

  const numberOfPagesVisited = responsesByPageView.size;

  for (const [, frameResponses] of responsesByPageView) {
    for (const [, { url, dataLength }] of frameResponses) {
      if (url.length === 0) {
        throw new Error('navigateToApps(); failed to identify the url of the request');
      }
      if (assetSizeMeasurements.has(url)) {
        assetSizeMeasurements.set(url, [dataLength].concat(assetSizeMeasurements.get(url) || []));
      } else {
        assetSizeMeasurements.set(url, [dataLength]);
      }
    }
  }

  return Array.from(assetSizeMeasurements.entries())
    .map(([url, measurements]) => {
      const baseUrl = createUrl('/', options.appConfig.url);
      const relativeUrl = url
        // remove the baseUrl (expect the trailing slash) to make url relative
        .replace(baseUrl.slice(0, -1), '')
        // strip the build number from asset urls
        .replace(/^\/\d+\//, '/');
      return [relativeUrl, measurements] as const;
    })
    .filter(([url, measurements]) => {
      if (measurements.length !== numberOfPagesVisited) {
        // ignore urls seen only on some pages
        return false;
      }

      if (url.startsWith('data:')) {
        // ignore data urls since they are already counted by other assets
        return false;
      }

      if (url.startsWith('/api/') || url.startsWith('/internal/')) {
        // ignore api requests since they don't have deterministic sizes
        return false;
      }

      const allMetricsAreEqual = measurements.every((x, i) =>
        i === 0 ? true : x === measurements[i - 1]
      );
      if (!allMetricsAreEqual) {
        throw new Error(`measurements for url [${url}] are not equal [${measurements.join(',')}]`);
      }

      return true;
    })
    .map(([url, measurements]) => {
      return { group: 'page load asset size', id: url, value: measurements[0] };
    });
}
