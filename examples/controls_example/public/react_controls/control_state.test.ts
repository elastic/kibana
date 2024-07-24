/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlWidth } from '@kbn/controls-plugin/public/types';
import { initializeDefaultControlApi } from './initialize_default_control_api';
import { COMPARATOR_SUBJECTS_DEBOUNCE, initializeControlState } from './control_state';
import { DefaultControlState } from './types';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { Subject } from 'rxjs';

describe('state diffing', () => {
  const saveNotification$ = new Subject<void>();
  let setWidth: (width: ControlWidth) => void;
  let unsavedChanges: PublishingSubject<Partial<DefaultControlState> | undefined>;
  let resetUnsavedChanges: () => void;
  beforeEach(() => {
    const { initialState, startStateDiffing } = initializeControlState('control1', {
      getSerializedStateForChild: () => {
        return {
          rawState: {
            grow: true,
            width: 'medium'
          } as DefaultControlState,
          references: [],
        };
      },
      saveNotification$
    });
    const { comparators } = initializeDefaultControlApi(initialState);
    setWidth = comparators.width[1];
    const stateDiffing = startStateDiffing(comparators);
    unsavedChanges = stateDiffing.unsavedChanges;
    resetUnsavedChanges = stateDiffing.resetUnsavedChanges;
  });

  test('should have no unsaved changes after initialization', () => {
    expect(unsavedChanges.value).toBeUndefined();
  });

  test('should have unsaved changes when a property changes', async () => {
    setWidth('small');
    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(unsavedChanges.value).toEqual({
      width: 'small'
    });
  });

  test('should have no unsaved changes after save', async () => {
    setWidth('small');
    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(unsavedChanges.value).not.toBeUndefined();

    // trigger save
    saveNotification$.next();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unsavedChanges.value).toBeUndefined();
  });

  test('should have no unsaved changes after reset', async () => {
    setWidth('small');
    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(unsavedChanges.value).not.toBeUndefined();

    // trigger reset
    resetUnsavedChanges();

    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(unsavedChanges.value).toBeUndefined();
  });
});