/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';
import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  type ControlWidth,
  type DefaultDataControlState,
} from '../../common';
import { OptionsListControlState } from '../../common/options_list';
import { mockDataControlState, mockOptionsListControlState } from '../mocks';
import { removeHideExcludeAndHideExists } from './control_group_migrations';
import { getDefaultControlGroupState } from './control_group_persistence';
import type { SerializableControlGroupState } from './types';

describe('migrate control group', () => {
  const getOptionsListControl = (order: number, input?: Partial<OptionsListControlState>) => {
    return {
      type: OPTIONS_LIST_CONTROL,
      order,
      width: 'small' as ControlWidth,
      grow: true,
      explicitInput: { ...mockOptionsListControlState, ...input },
    } as unknown as SerializableRecord;
  };

  const getRangeSliderControl = (order: number, input?: Partial<DefaultDataControlState>) => {
    return {
      type: RANGE_SLIDER_CONTROL,
      order,
      width: 'medium' as ControlWidth,
      grow: false,
      explicitInput: { ...mockDataControlState, ...input },
    } as unknown as SerializableRecord;
  };

  describe('remove hideExclude and hideExists', () => {
    test('should migrate single options list control', () => {
      const migratedControlGroupState: SerializableControlGroupState =
        removeHideExcludeAndHideExists({
          ...getDefaultControlGroupState(),
          panels: {
            testPanelId: getOptionsListControl(0, { hideExclude: true }),
          },
        });
      expect(migratedControlGroupState.panels).toEqual({
        testPanelId: getOptionsListControl(0),
      });
    });

    test('should migrate multiple options list controls', () => {
      const migratedControlGroupInput: SerializableControlGroupState =
        removeHideExcludeAndHideExists({
          ...getDefaultControlGroupState(),
          panels: {
            testPanelId1: getOptionsListControl(0),
            testPanelId2: getOptionsListControl(1, { hideExclude: false }),
            testPanelId3: getOptionsListControl(2, { hideExists: true }),
            testPanelId4: getOptionsListControl(3, {
              hideExclude: true,
              hideExists: false,
            }),
            testPanelId5: getOptionsListControl(4, {
              hideExists: true,
              hideExclude: false,
              singleSelect: true,
              runPastTimeout: true,
              selectedOptions: ['test'],
            }),
          },
        });
      expect(migratedControlGroupInput.panels).toEqual({
        testPanelId1: getOptionsListControl(0),
        testPanelId2: getOptionsListControl(1),
        testPanelId3: getOptionsListControl(2),
        testPanelId4: getOptionsListControl(3),
        testPanelId5: getOptionsListControl(4, {
          singleSelect: true,
          runPastTimeout: true,
          selectedOptions: ['test'],
        }),
      });
    });

    test('should migrate multiple different types of controls', () => {
      const migratedControlGroupInput: SerializableControlGroupState =
        removeHideExcludeAndHideExists({
          ...getDefaultControlGroupState(),
          panels: {
            testPanelId1: getOptionsListControl(0, {
              hideExists: true,
              hideExclude: true,
              runPastTimeout: true,
            }),
            testPanelId2: getRangeSliderControl(1),
          },
        });
      expect(migratedControlGroupInput.panels).toEqual({
        testPanelId1: getOptionsListControl(0, { runPastTimeout: true }),
        testPanelId2: getRangeSliderControl(1),
      });
    });
  });
});
