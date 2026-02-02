/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, map } from "rxjs";
import { v4 as uuidv4 } from 'uuid';
import { DrilldownsManager, DrilldownsState, DrilldownState, DrilldownStateInternal } from "./types";
import { StateComparators } from "@kbn/presentation-publishing";
import { createAction } from "./create_action";

export function initializeDrilldownsManager(
  embeddableUuid: string,
  state: DrilldownsState,
): DrilldownsManager {
  const drilldowns$ = new BehaviorSubject<DrilldownStateInternal[]>([]);
  const api: DrilldownsManager['api'] = {
    drilldowns$: drilldowns$.pipe(map((drilldowns) => drilldowns.map((drilldown) => {
      const { actionId, ...rest } = drilldown;
      return rest;
    }))),
    setDrilldowns: (drilldowns: DrilldownState[]) => {
      const drilldownsInternal = drilldowns.map((drilldown) => {
        return {
          ...drilldown,
          actionId: `${drilldown.type}_${uuidv4()}`
        }
      });
      drilldowns$.next(drilldownsInternal);
      drilldownsInternal.forEach((drilldownState) => createAction(embeddableUuid, drilldownState));
    },
  };
  api.setDrilldowns(state.drilldowns ?? []);
  
  function getLatestState() {
    return { drilldowns: drilldowns$.value };
  }

  /*protected killAction({ eventId, triggers }: SerializedEvent) {
    const { uiActions } = this.params;
    const actionId = this.generateActionId(eventId);
    if (!uiActions.hasAction(actionId)) return;

    for (const trigger of triggers) uiActions.detachAction(trigger, actionId);
    uiActions.unregisterAction(actionId);
  }*/

  return {
    api: { ...api },
    cleanup: () => deleteActions(),
    comparators: {
      drilldowns: 'deepEquality',
    } as StateComparators<DrilldownsState>,
    anyStateChange$: drilldowns$.pipe(map(() => undefined)),
    getLatestState,
    reinitializeState: (lastState: DrilldownsState) => {
      api.setDrilldowns(lastState.drilldowns ?? []);
    },
  };
}

