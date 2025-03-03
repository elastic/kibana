/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { Reporter, Storage } from '@kbn/analytics';
import { HttpSetup } from '@kbn/core/public';
import { UiCounters } from '../../common/types';

interface AnalyticsReporterConfig {
  localStorage: Storage;
  logger: Logger;
  fetch: HttpSetup;
}

export function createReporter(config: AnalyticsReporterConfig): Reporter {
  const { localStorage, logger, fetch } = config;

  return new Reporter({
    logger,
    storage: localStorage,
    async http(report) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetch.post<any>('/api/ui_counters/_report', {
        body: JSON.stringify({ report }),
        asSystemRequest: true,
      });
      const okStatus: UiCounters.v1.UiCountersResponseOk = response.status;
      if (response.status !== okStatus) {
        throw Error('Unable to store report.');
      }
      return response;
    },
  });
}
