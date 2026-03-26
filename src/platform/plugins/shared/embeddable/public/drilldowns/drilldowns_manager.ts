/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import deepEqual from 'fast-deep-equal';
import type { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import type { DrilldownsManager, DrilldownActionState } from './types';
import { createAction } from './create_action';
import { deleteAction } from './delete_action';
import type { SerializedDrilldowns, DrilldownState } from '../../server';

export function initializeDrilldownsManager(
  embeddableUuid: string,
  state: SerializedDrilldowns
): DrilldownsManager {
  const drilldowns$ = new BehaviorSubject<DrilldownActionState[]>([]);
  const api: DrilldownsManager['api'] = {
    drilldowns$: drilldowns$ as PublishingSubject<DrilldownActionState[]>,
    setDrilldowns: (next: DrilldownState[]) => {
      deleteActions();
      const drilldowns = next.map((drilldown) => {
        return {
          ...drilldown,
          actionId: `${drilldown.type}_${uuidv4()}`,
        };
      });
      drilldowns$.next(drilldowns);
      drilldowns.forEach((drilldownState) => createAction(embeddableUuid, drilldownState));
    },
  };
  api.setDrilldowns(state.drilldowns ?? []);

  function deleteActions() {
    drilldowns$.value.forEach(deleteAction);
  }

  return {
    api: { ...api },
    cleanup: deleteActions,
    comparators: {
      drilldowns: (a, b) => deepEqual(a ?? [], b ?? []),
    } as StateComparators<SerializedDrilldowns>,
    anyStateChange$: drilldowns$.pipe(map(() => undefined)),
    getLatestState: () => ({
      drilldowns: drilldowns$.value.map((drilldown) => {
        const { actionId, ...rest } = drilldown;
        return rest;
      }),
    }),
    reinitializeState: (lastState: SerializedDrilldowns) => {
      api.setDrilldowns(lastState.drilldowns ?? []);
    },
  };
}
