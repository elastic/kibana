/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger, EventTypeOpts } from '@kbn/core/server';

export abstract class WorkflowsTelemetryClient {
  constructor(
    protected readonly telemetry: AnalyticsServiceSetup,
    protected readonly logger: Logger
  ) {}

  protected reportEvent<T extends object>(eventTypeOpts: EventTypeOpts<T>, data: T): void {
    try {
      this.telemetry.reportEvent(eventTypeOpts.eventType, data);
    } catch (e) {
      this.logger.error(`Error reporting event ${eventTypeOpts.eventType}: ${e.message}`);
    }
  }
}

