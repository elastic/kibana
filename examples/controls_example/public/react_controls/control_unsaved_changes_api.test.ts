/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlWidth } from '@kbn/controls-plugin/public/types';
import { initializeDefaultControlApi } from './initialize_default_control_api';
import {
  COMPARATOR_SUBJECTS_DEBOUNCE,
  initializeUnsavedChangesApi,
} from './control_unsaved_changes_api';
import { DefaultControlState } from './types';
import { PublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { Subject } from 'rxjs';

describe('initializeUnsavedChangesApi', () => {
  const parentApi = {
    saveNotification$: new Subject<void>(),
  };
  let setWidth: (width: ControlWidth) => void;
  let api: undefined | PublishesUnsavedChanges;
  beforeEach(() => {
    const initialState: DefaultControlState = {
      grow: true,
      width: 'medium',
    };
    const { comparators } = initializeDefaultControlApi(initialState);
    setWidth = comparators.width[1];
    ({ api } = initializeUnsavedChangesApi(initialState, parentApi, comparators));
  });

  test('should have no unsaved changes after initialization', () => {
    expect(api?.unsavedChanges.value).toBeUndefined();
  });

  test('should have unsaved changes when a property changes', async () => {
    setWidth('small');
    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(api?.unsavedChanges.value).toEqual({
      width: 'small',
    });
  });

  test('should have no unsaved changes after save', async () => {
    setWidth('small');
    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(api?.unsavedChanges.value).not.toBeUndefined();

    // trigger save
    parentApi.saveNotification$.next();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api?.unsavedChanges.value).toBeUndefined();
  });

  test('should have no unsaved changes after reset', async () => {
    setWidth('small');
    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(api?.unsavedChanges.value).not.toBeUndefined();

    // trigger reset
    api?.resetUnsavedChanges();

    await new Promise((resolve) => setTimeout(resolve, COMPARATOR_SUBJECTS_DEBOUNCE + 1));
    expect(api?.unsavedChanges.value).toBeUndefined();
  });
});
