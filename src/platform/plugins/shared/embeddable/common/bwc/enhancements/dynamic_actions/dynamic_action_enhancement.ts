/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DynamicActionsState, SerializedEvent } from './types';
import { dashboardDrilldownPersistableState } from './dashboard_drilldown_persistable_state';

export const dynamicActionsPersistableState = {
  extract: (state: DynamicActionsState) => {
    const references: Reference[] = [];
    const newState: DynamicActionsState = {
      events: (state as DynamicActionsState).events.map((eventState: SerializedEvent) => {
        const result =
          eventState.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN'
            ? dashboardDrilldownPersistableState.extract(eventState)
            : {
                state: eventState,
                references: [],
              };
        result.references.forEach((r) => references.push(r));
        return result.state;
      }),
    };
    return { state: newState, references };
  },
  inject: (state: DynamicActionsState, references: Reference[]) => {
    return {
      events: state.events.map((eventState: SerializedEvent) => {
        return eventState.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN'
          ? dashboardDrilldownPersistableState.inject(eventState, references)
          : eventState;
      }),
    } as DynamicActionsState;
  },
  telemetry(state: DynamicActionsState, telemetryData: Record<string, number>) {
    const getMetricKey = (path: string) => `dynamicActions.${path}`;

    const outputTelemetryData = { ...telemetryData };
    const countMetricKey = getMetricKey('count');

    outputTelemetryData[countMetricKey] =
      state.events.length + (outputTelemetryData[countMetricKey] || 0);

    for (const event of state.events) {
      const factoryId = event.action.factoryId;
      const actionCountMetric = getMetricKey(`actions.${factoryId}.count`);

      outputTelemetryData[actionCountMetric] = 1 + (outputTelemetryData[actionCountMetric] || 0);

      for (const trigger of event.triggers) {
        const triggerCountMetric = getMetricKey(`triggers.${trigger}.count`);
        const actionXTriggerCountMetric = getMetricKey(
          `action_triggers.${factoryId}_${trigger}.count`
        );

        outputTelemetryData[triggerCountMetric] =
          1 + (outputTelemetryData[triggerCountMetric] || 0);
        outputTelemetryData[actionXTriggerCountMetric] =
          1 + (outputTelemetryData[actionXTriggerCountMetric] || 0);
      }
    }

    return outputTelemetryData;
  },
};
