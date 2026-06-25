/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { workflowsTelemetryEvents } from './events/workflows';
import type {
  TelemetryEventTypeData,
  TelemetryEventTypes,
  TelemetryServiceClient,
  TelemetryServiceSetupParams,
} from './types';

/**
 * Service that interacts with the Core's analytics module
 * to trigger custom events for Workflows plugin features
 */
export class TelemetryService {
  private analytics: AnalyticsServiceSetup | null = null;

  public setup({ analytics }: TelemetryServiceSetupParams) {
    this.analytics = analytics;
    workflowsTelemetryEvents.forEach((eventConfig) =>
      analytics.registerEventType<TelemetryEventTypeData<TelemetryEventTypes>>(eventConfig)
    );
  }

  public getClient(): TelemetryServiceClient {
    const reportEvent = this.analytics?.reportEvent.bind(this.analytics);

    if (!this.analytics || !reportEvent) {
      throw new Error(
        'The TelemetryService.setup() method has not been invoked, be sure to call it during the plugin setup.'
      );
    }

    return { reportEvent };
  }
}
