/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import {
  getDefaultControlGroupState,
  mockDataControlState,
  mockOptionsListControlState,
} from '../..//common/mocks';
import {
  type ControlPanelState,
  type ControlWidth,
  type DefaultDataControlState,
  type SerializedControlState,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  ControlGroupSerializedState,
  ControlGroupRuntimeState,
  DefaultControlState,
  ControlPanelsState,
} from '../../common';
import { removeHideExcludeAndHideExists } from './control_group_migrations';

describe('migrate control group', () => {
  const getOptionsListControl = (order: number, input?: Partial<DefaultDataControlState>) => {
    return {
      type: OPTIONS_LIST_CONTROL,
      order,
      width: 'small' as ControlWidth,
      grow: true,
      explicitInput: { ...mockOptionsListControlState, ...input },
    } as ControlPanelState<SerializedControlState<DefaultDataControlState>>;
  };

  const getRangeSliderControl = (order: number, input?: Partial<object>) => {
    return {
      type: RANGE_SLIDER_CONTROL,
      order,
      width: 'medium' as ControlWidth,
      grow: false,
      explicitInput: { ...mockDataControlState, ...input },
    } as ControlPanelState<SerializedControlState<DefaultDataControlState>>;
  };

  const getControlGroupState = (panels: ControlPanelsState): ControlGroupRuntimeState => {
    return {
      ...getDefaultControlGroupState(),
      initialChildControlState: panels,
    };
  };

  describe('remove hideExclude and hideExists', () => {
    test('should migrate single options list control', () => {
      const migratedControlGroupInput: ControlGroupRuntimeState = removeHideExcludeAndHideExists(
        getControlGroupState([getOptionsListControl(0, { id: 'testPanelId', hideExclude: true })])
      );
      expect(migratedControlGroupInput.panels).toEqual({
        testPanelId: getOptionsListControl(0, { id: 'testPanelId' }),
      });
    });
    test('should migrate multiple options list controls', () => {
      const migratedControlGroupInput: ControlGroupInput = removeHideExcludeAndHideExists(
        getControlGroupState([
          getOptionsListControl(0, { id: 'testPanelId1' }),
          getOptionsListControl(1, { id: 'testPanelId2', hideExclude: false }),
          getOptionsListControl(2, { id: 'testPanelId3', hideExists: true }),
          getOptionsListControl(3, {
            id: 'testPanelId4',
            hideExclude: true,
            hideExists: false,
          }),
          getOptionsListControl(4, {
            id: 'testPanelId5',
            hideExists: true,
            hideExclude: false,
            singleSelect: true,
            runPastTimeout: true,
            selectedOptions: ['test'],
          }),
        ])
      );
      expect(migratedControlGroupInput.panels).toEqual({
        testPanelId1: getOptionsListControl(0, { id: 'testPanelId1' }),
        testPanelId2: getOptionsListControl(1, { id: 'testPanelId2' }),
        testPanelId3: getOptionsListControl(2, { id: 'testPanelId3' }),
        testPanelId4: getOptionsListControl(3, {
          id: 'testPanelId4',
        }),
        testPanelId5: getOptionsListControl(4, {
          id: 'testPanelId5',
          singleSelect: true,
          runPastTimeout: true,
          selectedOptions: ['test'],
        }),
      });
    });

    test('should migrate multiple different types of controls', () => {
      const migratedControlGroupInput: ControlGroupInput = removeHideExcludeAndHideExists(
        getControlGroupState([
          getOptionsListControl(0, {
            id: 'testPanelId1',
            hideExists: true,
            hideExclude: true,
            runPastTimeout: true,
          }),
          getRangeSliderControl(1, { id: 'testPanelId2' }),
        ])
      );
      expect(migratedControlGroupInput.panels).toEqual({
        testPanelId1: getOptionsListControl(0, { id: 'testPanelId1', runPastTimeout: true }),
        testPanelId2: getRangeSliderControl(1, { id: 'testPanelId2' }),
      });
    });
  });
});
