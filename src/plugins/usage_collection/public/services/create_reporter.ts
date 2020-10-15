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

import { Reporter, Storage } from '@kbn/analytics';
import { HttpSetup } from 'kibana/public';

interface AnalyicsReporterConfig {
  localStorage: Storage;
  debug: boolean;
  fetch: HttpSetup;
}

export function createReporter(config: AnalyicsReporterConfig): Reporter {
  const { localStorage, debug, fetch } = config;

  return new Reporter({
    debug,
    storage: localStorage,
    async http(report) {
      const response = await fetch.post('/api/ui_metric/report', {
        body: JSON.stringify({ report }),
      });

      if (response.status !== 'ok') {
        throw Error('Unable to store report.');
      }
      return response;
    },
  });
}
