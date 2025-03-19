/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { EventMetric, EventFieldType, eventTypes } from './event_definitions';

export class InterceptTelemetry {
  private reportEvent?: AnalyticsServiceStart['reportEvent'];

  public setup({ analytics }: { analytics: AnalyticsServiceSetup }) {
    eventTypes.forEach((eventType) => {
      analytics.registerEventType(eventType);
    });

    return {};
  }

  public start({ analytics }: { analytics: AnalyticsServiceStart }) {
    this.reportEvent = analytics.reportEvent;

    return {
      reportInterceptInteraction: this.reportInterceptInteraction.bind(this),
    };
  }

  private reportInterceptInteraction({ interactionType }: { interactionType: string }) {
    this.reportEvent?.(EventMetric.INTERCEPT_INTERACTION, {
      [EventFieldType.INTERACTION_TYPE]: interactionType,
    });
  }
}
