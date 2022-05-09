/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reporter, Storage } from '@kbn/analytics';
import { HttpSetup } from '@kbn/core/public';

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetch.post<any>('/api/ui_counters/_report', {
        body: JSON.stringify({ report }),
        asSystemRequest: true,
      });

      if (response.status !== 'ok') {
        throw Error('Unable to store report.');
      }
      return response;
    },
  });
}
