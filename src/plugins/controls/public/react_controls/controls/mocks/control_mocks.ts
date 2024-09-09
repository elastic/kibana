/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange } from '@kbn/es-query';
import { PublishesUnifiedSearch, StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { ControlFetchContext } from '../../control_group/control_fetch/control_fetch';
import { ControlGroupApi } from '../../control_group/types';
import { ControlApiRegistration, ControlFactory, DefaultControlApi } from '../types';

export const getMockedControlGroupApi = (
  dashboardApi: Partial<PublishesUnifiedSearch> = {
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  },
  overwriteApi?: Partial<ControlGroupApi>
) => {
  return {
    parentApi: dashboardApi,
    autoApplySelections$: new BehaviorSubject(true),
    ignoreParentSettings$: new BehaviorSubject(undefined),
    controlFetch$: () => new BehaviorSubject<ControlFetchContext>({}),
    allowExpensiveQueries$: new BehaviorSubject(true),
    ...overwriteApi,
  } as unknown as ControlGroupApi;
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
      unsavedChanges: new BehaviorSubject<Partial<StateType> | undefined>(undefined),
      resetUnsavedChanges: () => {},
      type: factory.type,
    };
  };
