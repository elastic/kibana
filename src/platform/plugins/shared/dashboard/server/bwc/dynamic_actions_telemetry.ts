/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

interface SerializedAction<Config extends SerializableRecord = SerializableRecord> {
  readonly factoryId: string;
  readonly name: string;
  readonly config: Config;
}

interface SerializedEvent {
  eventId: string;
  triggers: string[];
  action: SerializedAction;
}

interface DynamicActionsState {
  events: SerializedEvent[];
}

/** Returns prefixed telemetry metric key for all dynamic action metrics. */
export const getMetricKey = (path: string) => `dynamicActions.${path}`;

export function dynamicActionsTelemetry(
  state: SerializableRecord,
  telemetryData: Record<string, number>
) {
  const outputTelemetryData = { ...telemetryData };
  const countMetricKey = getMetricKey('count');

  outputTelemetryData[countMetricKey] =
    (state as DynamicActionsState).events.length + (outputTelemetryData[countMetricKey] || 0);

  for (const event of (state as DynamicActionsState).events) {
    const factoryId = event.action.factoryId;
    const actionCountMetric = getMetricKey(`actions.${factoryId}.count`);

    outputTelemetryData[actionCountMetric] = 1 + (outputTelemetryData[actionCountMetric] || 0);

    for (const trigger of event.triggers) {
      const triggerCountMetric = getMetricKey(`triggers.${trigger}.count`);
      const actionXTriggerCountMetric = getMetricKey(
        `action_triggers.${factoryId}_${trigger}.count`
      );

      outputTelemetryData[triggerCountMetric] = 1 + (outputTelemetryData[triggerCountMetric] || 0);
      outputTelemetryData[actionXTriggerCountMetric] =
        1 + (outputTelemetryData[actionXTriggerCountMetric] || 0);
    }
  }

  return outputTelemetryData;
}
