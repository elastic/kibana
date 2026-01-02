/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Reference } from '@kbn/content-management-utils';
import type { DynamicActionsState, SerializedEvent } from './types';
import { dashboardDrilldownPersistableState } from './dashboard_drilldown_persistable_state';

export const dynamicActionsPersistableState = {
  extract: (state: SerializableRecord) => {
    const references: Reference[] = [];
    const newState: DynamicActionsState = {
      events: (state as DynamicActionsState).events.map((eventState: SerializedEvent) => {
        const result = eventState.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN'
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
  inject: (state: SerializableRecord, references: Reference[]) => {
    return {
      events: (state as DynamicActionsState).events.map((eventState: SerializedEvent) => {
        return eventState.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN' ? dashboardDrilldownPersistableState.inject(eventState, references) : eventState;
      }),
    } as DynamicActionsState;
  }
}
