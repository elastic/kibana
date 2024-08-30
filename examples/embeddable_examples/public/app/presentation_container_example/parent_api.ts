/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastSavedState } from './last_saved_state';
import { unsavedChanges } from './unsaved_changes';
import { LastSavedState, ParentApi, UnsavedChanges } from './types';
import { BehaviorSubject } from 'rxjs';
import { TimeRange } from '@kbn/es-query';

export function getParentApi(): ParentApi {
  const lastSavedState$ = new BehaviorSubject<LastSavedState>(lastSavedState.load());
  const unsavedChanges$ = new BehaviorSubject<UnsavedChanges>(unsavedChanges.load());

  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const panels$ = new BehaviorSubject<Array<{ id: string, type: string }>>(
    unsavedChanges$.value.panels ?? lastSavedState$.value.panelsState.map(({ id, type }) => {
      return { id, type };
    })
  );

  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(
    unsavedChanges$.value.timeRange ?? lastSavedState$.value.timeRange
  );

  return {
    children$,
    /**
     * return last saved embeddable state
     */
    getSerializedStateForChild: (childId: string) => {
      const panel = lastSavedState$.value.panelsState.find(({ id }) => {
        return id === childId;
      });
      return panel ? panel.panelState : undefined;
    },
    /**
     * return previous session's unsaved changes for embeddable
     */
    getRuntimeStateForChild: (childId: string) => {
      const panelUnsavedChanges = unsavedChanges$.value.panelUnsavedChanges;
      return panelUnsavedChanges ? panelUnsavedChanges[childId] : undefined;
    },
    panels$,
    timeRange$,
  };
}
