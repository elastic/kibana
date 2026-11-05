/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BrowserProfile } from './browser_profiles';
import { EdotBrowserClient, type EdotBrowserClientOptions } from './edot_browser_client';

export interface EdotBrowserAppOptions {
  serviceName: string;
  serviceVersion?: string;
  /** Omit it for an app that isn't deployed to a named environment. */
  environment?: string;
  sdkVersion?: string;
  distroVersion?: string;
}

/** An app instrumented with EDOT Browser; holds the app-level resource attributes. */
export class EdotBrowserApp {
  readonly resourceAttributes: Readonly<Record<string, unknown>>;

  constructor({
    serviceName,
    serviceVersion = '1.0.0',
    environment,
    sdkVersion = '2.10.0',
    // 0.4.0 is the first release that writes session data and a session.start event
    distroVersion = '0.4.0',
  }: EdotBrowserAppOptions) {
    this.resourceAttributes = {
      'service.name': serviceName,
      'service.version': serviceVersion,
      ...(environment !== undefined ? { 'deployment.environment.name': environment } : {}),
      'telemetry.sdk.name': 'opentelemetry',
      'telemetry.sdk.language': 'webjs',
      'telemetry.sdk.version': sdkVersion,
      'telemetry.distro.name': 'elastic',
      'telemetry.distro.version': distroVersion,
    };
  }

  /** A browser of the given profile running this app. */
  client(profile: BrowserProfile, options?: EdotBrowserClientOptions): EdotBrowserClient {
    return new EdotBrowserClient(
      { ...this.resourceAttributes, ...profile.resourceAttributes },
      options
    );
  }
}
