/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, of } from 'rxjs';

import { SerializedPanelState } from '@kbn/presentation-publishing';

import { CONTROL_GROUP_TYPE } from '../../../common';
import type { ControlFetchContext } from '../../control_group/control_fetch/control_fetch';
import type { ControlGroupApi } from '../../control_group/types';

export type MockedControlGroupApi = ControlGroupApi & {
  setLastSavedStateForChild: (uuid: string, state: object) => void;
};

export const getMockedControlGroupApi = (
  dashboardApi?: unknown,
  overwriteApi?: Partial<ControlGroupApi>
) => {
  const controlStateMap: Record<string, BehaviorSubject<SerializedPanelState<object>>> = {};
  return {
    type: CONTROL_GROUP_TYPE,
    parentApi: dashboardApi,
    autoApplySelections$: new BehaviorSubject(true),
    ignoreParentSettings$: new BehaviorSubject(undefined),
    controlFetch$: () => new BehaviorSubject<ControlFetchContext>({}),
    allowExpensiveQueries$: new BehaviorSubject(true),
    lastSavedStateForChild$: (childId: string) => controlStateMap[childId] ?? of(undefined),
    getLastSavedStateForChild: (childId: string) => {
      return controlStateMap[childId]?.value ?? { rawState: {} };
    },
    setLastSavedStateForChild: (
      childId: string,
      serializePanelState: SerializedPanelState<object>
    ) => {
      if (!controlStateMap[childId]) {
        controlStateMap[childId] = new BehaviorSubject(serializePanelState);
        return;
      }
      controlStateMap[childId].next(serializePanelState);
    },
    ...overwriteApi,
  } as unknown as MockedControlGroupApi;
};
