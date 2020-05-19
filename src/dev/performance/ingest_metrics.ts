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

import { CiStatsReporter, ToolingLog } from '@kbn/dev-utils';
import { LoadingFinishedEvent, ResponseReceivedEvent } from './event';

export function ingestPerformanceMetrics(
  log: ToolingLog,
  responses: Map<
    string,
    Map<string, { loadingFinished: LoadingFinishedEvent; responseRecieved: ResponseReceivedEvent }>
  >
) {
  const uniqueRequests = new Map<
    string,
    Array<{ path: string; encodedBodyLength: number; plugin?: string; type?: string }>
  >();

  for (const [path, frameResponses] of responses) {
    for (const [, response] of frameResponses) {
      const url: string = response.responseRecieved.response.url;
      const encodedBodyLength: number =
        response.loadingFinished.encodedDataLength -
        response.responseRecieved.response.encodedDataLength;
      if (uniqueRequests.has(url)) {
        uniqueRequests.set(
          url,
          [{ path, encodedBodyLength }].concat(uniqueRequests.get(url) || [])
        );
      } else {
        uniqueRequests.set(url, [{ path, encodedBodyLength }]);
      }
    }
  }

  const metrics = Array<{
    url: string;
    encodedBodyLength: number;
    plugin?: string;
    type?: string;
  }>();

  for (const [url, array] of uniqueRequests) {
    const isPlugin = url.endsWith('.plugin.js');
    if (isPlugin) {
      const type = url.match(/.*\/\d+.plugin.js$/) ? 'lazy' : 'entry';
      const results = url.match(/(?<=plugin\/)(.*)(?=\/)/);
      const plugin = results ? results[0] : url;
      const encodedBodyLength = Math.round(
        array.map((i: any) => i.encodedBodyLength).reduce((acc, value) => acc + value) /
          array.length
      );

      metrics.push({ url, plugin, type, encodedBodyLength });
    } else {
      if (array.length > 1) {
        const encodedBodyLength = Math.round(
          array.map((i: any) => i.encodedBodyLength).reduce((acc, value) => acc + value) /
            array.length
        );
        metrics.push({ url, encodedBodyLength });
      }
    }
  }

  const reporter = CiStatsReporter.fromEnv(log);
  await reporter.metrics(metrics.map(asset => ({
    group: 'Asset size',
    id: asset.url,
    value: asset.encodedBodyLength,
  })));
}
