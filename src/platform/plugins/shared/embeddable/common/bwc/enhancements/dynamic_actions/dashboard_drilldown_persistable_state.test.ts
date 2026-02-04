/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dashboardDrilldownPersistableState,
  EMBEDDABLE_TO_DASHBOARD_DRILLDOWN,
} from './dashboard_drilldown_persistable_state';
import type { SerializedEvent } from './types';

const state: SerializedEvent = {
  eventId: 'event_id',
  triggers: [],
  action: {
    factoryId: EMBEDDABLE_TO_DASHBOARD_DRILLDOWN,
    name: 'name',
    config: {
      dashboardId: 'dashboardId_1',
    },
  },
};

test('should extract and injected dashboard reference', () => {
  const { state: extractedState, references } = dashboardDrilldownPersistableState.extract(state);
  expect(extractedState).not.toEqual(state);
  expect(extractedState.action.config.dashboardId).toBeUndefined();
  expect(references).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "dashboardId_1",
        "name": "drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:event_id:dashboardId",
        "type": "dashboard",
      },
    ]
  `);

  let injectedState = dashboardDrilldownPersistableState.inject(extractedState, references);
  expect(injectedState).toEqual(state);

  references[0].id = 'dashboardId_2';

  injectedState = dashboardDrilldownPersistableState.inject(extractedState, references);
  expect(injectedState).not.toEqual(extractedState);
  expect(injectedState.action.config.dashboardId).toBe('dashboardId_2');
});
