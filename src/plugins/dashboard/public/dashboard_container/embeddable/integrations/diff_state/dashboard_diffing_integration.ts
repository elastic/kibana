/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { omit } from 'lodash';

import { isKeyEqual } from './dashboard_diffing_functions';
import { DashboardContainer } from '../../dashboard_container';
import { DashboardContainerInput } from '../../../../../common';
import { pluginServices } from '../../../../services/plugin_services';
import { dashboardContainerReducers } from '../../../state/dashboard_container_reducers';

/**
 * An array of reducers which cannot cause unsaved changes. Unsaved changes only compares the explicit input
 * and the last saved input, so we can safely ignore any output reducers, and most componentState reducers.
 * This is only for performance reasons, because the diffing function itself can be quite heavy.
 */
export const reducersToIgnore: Array<keyof typeof dashboardContainerReducers> = [
  'setTimeslice',
  'setFullScreenMode',
  'setSearchSessionId',
  'setExpandedPanelId',
  'setHasUnsavedChanges',
];

/**
 * Some keys will often have deviated from their last saved state, but should not persist over reloads
 */
const keysToOmitFromSessionStorage: Array<keyof DashboardContainerInput> = [
  'lastReloadRequestTime',
  'executionContext',
  'searchSessionId',
  'timeslice',

  'timeRange', // Current behaviour expects time range not to be backed up. Revisit this?
  'refreshInterval',
];

/**
 * Some keys will often have deviated from their last saved state, but should be
 * ignored when calculating whether or not this dashboard has unsaved changes.
 */
export const keysNotConsideredUnsavedChanges: Array<keyof DashboardContainerInput> = [
  'lastReloadRequestTime',
  'executionContext',
  'searchSessionId',
  'timeslice',
  'viewMode',
];

export function updateUnsavedChangesState(
  this: DashboardContainer,
  unsavedChanges: Partial<DashboardContainerInput>
) {
  const {
    getState,
    dispatch,
    actions: { setHasUnsavedChanges },
  } = this.reduxEmbeddableTools;

  // dispatch has unsaved changes state
  const hasChanges = Object.keys(omit(unsavedChanges, keysNotConsideredUnsavedChanges)).length > 0;
  if (getState().componentState.hasUnsavedChanges !== hasChanges) {
    dispatch(setHasUnsavedChanges(hasChanges));
  }
}

export function backupUnsavedChanges(
  this: DashboardContainer,
  unsavedChanges: Partial<DashboardContainerInput>
) {
  const { dashboardSessionStorage } = pluginServices.getServices();
  dashboardSessionStorage.setState(
    this.getDashboardSavedObjectId(),
    omit(unsavedChanges, keysToOmitFromSessionStorage)
  );
}

type DashboardContainerInputWithoutId = Omit<DashboardContainerInput, 'id'>;

/**
 * Does a shallow diff between @param lastExplicitInput and @param currentExplicitInput and
 * @returns an object out of the keys which are different.
 */
export async function getUnsavedChanges(
  this: DashboardContainer,
  lastInput: DashboardContainerInputWithoutId,
  input: DashboardContainerInputWithoutId,
  keys?: Array<keyof DashboardContainerInputWithoutId>
): Promise<Partial<DashboardContainerInputWithoutId>> {
  const allKeys =
    keys ??
    ([...new Set([...Object.keys(lastInput), ...Object.keys(input)])] as Array<
      keyof DashboardContainerInputWithoutId
    >);
  const keyComparePromises = allKeys.map(
    (key) =>
      new Promise<{ key: keyof DashboardContainerInputWithoutId; isEqual: boolean }>((resolve) =>
        isKeyEqual(key, {
          container: this,

          currentValue: input[key],
          currentInput: input,

          lastValue: lastInput[key],
          lastInput,
        }).then((isEqual) => resolve({ key, isEqual }))
      )
  );
  const unsavedChanges = (await Promise.allSettled(keyComparePromises)).reduce(
    (changes, current) => {
      if (current.status === 'fulfilled') {
        const { key, isEqual } = current.value;
        if (!isEqual) (changes as { [key: string]: unknown })[key] = input[key];
      }
      return changes;
    },
    {} as Partial<DashboardContainerInput>
  );
  return unsavedChanges;
}
