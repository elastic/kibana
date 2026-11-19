/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InjectedMetadata } from '@kbn/core-injected-metadata-common-internal';

type EdotBrowserConfig = NonNullable<InjectedMetadata['edotBrowserConfig']>;

const SERVICE_NAME = 'kibana-frontend';

/**
 * Starts the EDOT Browser SDK when `telemetry.tracing.browser` is enabled.
 * Runs independently of the Elastic APM RUM agent in `ApmSystem`.
 */
export class EdotBrowserSystem {
  constructor(
    private readonly config: EdotBrowserConfig | null | undefined,
    private readonly serviceVersion: string
  ) {}

  async setup(): Promise<void> {
    if (!this.config) return;

    const { startBrowserSdk } = await import('@elastic/opentelemetry-browser');
    const { url, headers } = this.config;
    startBrowserSdk({
      serviceName: SERVICE_NAME,
      serviceVersion: this.serviceVersion,
      exportConfig: { url, headers },
      // Avoid tracing the SDK's own export requests.
      ignoreFetchUrls: [url],
    });
  }
}
