/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      const response = await fetch.post('/api/ui_counters/_report', {
        body: JSON.stringify({ report }),
      });

      if (response.status !== 'ok') {
        throw Error('Unable to store report.');
      }
      return response;
    },
  });
}
