/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getOptionsListControlFactory } from '../controls/data_controls/options_list_control/get_options_list_control_factory';
import { getMockedBuildApi, getMockedControlGroupApi } from '../controls/mocks/control_mocks';
import { ClearControlAction } from './clear_control_action';

import type { ViewMode } from '@kbn/presentation-publishing';
import type { OptionsListControlApi } from '../controls/data_controls/options_list_control/types';

const dashboardApi = {
  viewMode: new BehaviorSubject<ViewMode>('view'),
};
const controlGroupApi = getMockedControlGroupApi(dashboardApi, {
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  addNewPanel: jest.fn(),
  children$: new BehaviorSubject({}),
});

let clearControlAction: ClearControlAction;
let embeddable: any;
let optionsListApi: OptionsListControlApi;
let hasSelectionsSubject: BehaviorSubject<boolean | undefined>;

beforeAll(async () => {
  const controlFactory = getOptionsListControlFactory();
  const optionsListUuid = 'optionsListControlUuid';
  const optionsListControl = await controlFactory.buildControl(
    {
      dataViewId: 'test-data-view',
      title: 'test',
      fieldName: 'test-field',
      width: 'medium',
      grow: false,
    },
    getMockedBuildApi(optionsListUuid, controlFactory, controlGroupApi),
    optionsListUuid,
    controlGroupApi
  );

  optionsListApi = optionsListControl.api;
});

beforeEach(() => {
  hasSelectionsSubject = new BehaviorSubject<boolean | undefined>(undefined);
  clearControlAction = new ClearControlAction();

  embeddable = {
    ...optionsListApi,
    clearSelections: jest.fn(),
    hasSelections$: hasSelectionsSubject,
  };
});

describe('ClearControlAction', () => {
  test('should throw an error when called with an embeddable not in a parent', async () => {
    const noParentApi = { ...optionsListApi, parentApi: undefined };

    await expect(async () => {
      await clearControlAction.execute({ embeddable: noParentApi });
    }).rejects.toThrow(Error);
  });

  test('should call onChange when isCompatible changes', () => {
    const onChange = jest.fn();

    clearControlAction.subscribeToCompatibilityChanges({ embeddable }, onChange);
    hasSelectionsSubject.next(false);

    expect(onChange).toHaveBeenCalledWith(false, clearControlAction);
  });

  describe('Clear control button compatibility', () => {
    test('should be incompatible if there is no selection', async () => {
      const nothingIsSelected = { ...optionsListApi, hasSelections$: false };

      expect(await clearControlAction.isCompatible({ embeddable: nothingIsSelected })).toBe(false);
    });

    test('should be compatible if there is a selection', async () => {
      const hasSelections = { ...optionsListApi, hasSelections$: true };

      expect(await clearControlAction.isCompatible({ embeddable: hasSelections })).toBe(true);
    });
  });
});
