/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { SerializedPanelState, StateComparators } from '@kbn/presentation-publishing';

import { CONTROL_GROUP_TYPE } from '../../../common';
import type { ControlFetchContext } from '../../control_group/control_fetch/control_fetch';
import type { ControlGroupApi } from '../../control_group/types';
import type { ControlApiRegistration, ControlFactory, DefaultControlApi } from '../types';

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
    lastSavedStateForChild$: (childId: string) =>
      controlStateMap[childId] ?? new BehaviorSubject(undefined),
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

export const getMockedBuildApi =
  <StateType extends object = object, ApiType extends DefaultControlApi = DefaultControlApi>(
    uuid: string,
    factory: ControlFactory<StateType, ApiType>,
    controlGroupApi?: ControlGroupApi
  ) =>
  (api: ControlApiRegistration<ApiType>, nextComparators: StateComparators<StateType>) => {
    return {
      ...api,
      uuid,
      parentApi: controlGroupApi ?? getMockedControlGroupApi(),
      unsavedChanges$: new BehaviorSubject<Partial<StateType> | undefined>(undefined),
      resetUnsavedChanges: () => {
        return true;
      },
      type: factory.type,
    };
  };
