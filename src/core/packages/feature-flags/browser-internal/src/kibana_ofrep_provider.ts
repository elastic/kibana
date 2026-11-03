/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBasePath } from '@kbn/core-http-browser';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { Logger } from '@kbn/logging';
import { SeededOfrepWebProvider } from './seeded_ofrep_provider';

/** How often the browser asks Kibana for the server's flag snapshot. */
const OFREP_POLL_INTERVAL_MS = 30_000;

/**
 * Path the OFREP web provider treats as the server root.
 * The provider appends `ofrep/v1/evaluate/flags`.
 */
const OFREP_PROVIDER_BASE_PATH = '/internal/feature-flags/';

/** Browser provider that evaluates flags through Kibana's internal OFREP routes. */
export function createKibanaOfrepProvider({
  basePath,
  kibanaVersion,
  initialFlags,
  logger,
}: {
  basePath: IBasePath;
  kibanaVersion: string;
  initialFlags: Record<string, unknown>;
  logger: Pick<Logger, 'warn'>;
}): SeededOfrepWebProvider {
  const pathname = basePath.prepend(OFREP_PROVIDER_BASE_PATH);
  const baseUrl = new URL(pathname, window.location.origin).toString();

  return new SeededOfrepWebProvider({
    initialFlags,
    logger,
    ofrep: {
      baseUrl,
      headers: [
        ['kbn-version', kibanaVersion],
        ['kbn-xsrf', 'kibana'],
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana'],
      ],
      fetchImplementation: (input, init) =>
        globalThis.fetch(input, { ...init, credentials: 'same-origin' }),
      pollInterval: OFREP_POLL_INTERVAL_MS,
      changeDetection: 'polling',
      cacheMode: 'network-first',
    },
  });
}
