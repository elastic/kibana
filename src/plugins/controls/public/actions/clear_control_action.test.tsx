/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getMockedControlGroupApi } from '../controls/mocks/control_mocks';
import { ClearControlAction } from './clear_control_action';

import type { ViewMode } from '@kbn/presentation-publishing';

const dashboardApi = {
  viewMode: new BehaviorSubject<ViewMode>('view'),
};
const controlGroupApi = getMockedControlGroupApi(dashboardApi, {
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  addNewPanel: jest.fn(),
  children$: new BehaviorSubject({}),
});

const clearControlAction = new ClearControlAction();
const hasSelections$ = new BehaviorSubject<boolean | undefined>(undefined);

const controlApi = {
  type: 'test',
  uuid: '1',
  parentApi: controlGroupApi,
  hasSelections$,
  clearSelections: jest.fn(),
};
beforeEach(() => {
  hasSelections$.next(false);
});

describe('ClearControlAction', () => {
  test('should throw an error when called with an embeddable not in a parent', async () => {
    const noParentApi = { ...controlApi, parentApi: undefined };

    await expect(async () => {
      await clearControlAction.execute({ embeddable: noParentApi });
    }).rejects.toThrow(Error);
  });

  test('should call onChange when isCompatible changes', () => {
    const onChange = jest.fn();

    hasSelections$.next(true);
    clearControlAction.subscribeToCompatibilityChanges({ embeddable: controlApi }, onChange);

    expect(onChange).toHaveBeenCalledWith(true, clearControlAction);
  });

  describe('Clear control button compatibility', () => {
    test('should be incompatible if there is no selection', async () => {
      const nothingIsSelected = { ...controlApi, hasSelections$: false };

      expect(await clearControlAction.isCompatible({ embeddable: nothingIsSelected })).toBe(false);
    });

    test('should be compatible if there is a selection', async () => {
      const hasSelections = { ...controlApi, hasSelections$: true };

      expect(await clearControlAction.isCompatible({ embeddable: hasSelections })).toBe(true);
    });
  });
});
