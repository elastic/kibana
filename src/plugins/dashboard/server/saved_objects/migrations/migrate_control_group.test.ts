/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { migrateControlGroup } from './migrate_control_group';
import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { DashboardAttributes } from '../../../common';
import {
  ControlWidth,
  ControlsPanels,
  ControlPanelState,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  OptionsListEmbeddableInput,
  RangeSliderEmbeddableInput,
} from '@kbn/controls-plugin/common';
import {
  mockOptionsListEmbeddableInput,
  mockRangeSliderEmbeddableInput,
} from '@kbn/controls-plugin/common/mocks';

const savedObjectMigrationContext = null as unknown as SavedObjectMigrationContext;

describe('migrate control group', () => {
  const getOptionsListControl = (order: number, input?: Partial<OptionsListEmbeddableInput>) => {
    return {
      type: OPTIONS_LIST_CONTROL,
      order,
      width: 'small' as ControlWidth,
      grow: true,
      explicitInput: { ...mockOptionsListEmbeddableInput, ...input },
    } as ControlPanelState;
  };

  const getRangeSliderControl = (order: number, input?: Partial<RangeSliderEmbeddableInput>) => {
    return {
      type: RANGE_SLIDER_CONTROL,
      order,
      width: 'medium' as ControlWidth,
      grow: false,
      explicitInput: { ...mockRangeSliderEmbeddableInput, ...input },
    } as ControlPanelState;
  };

  const getControlGroupDoc = (panels: ControlsPanels) => {
    return {
      attributes: {
        controlGroupInput: {
          panelsJSON: JSON.stringify(panels),
        },
      },
    };
  };

  test('should not migrate dashboard without control group', () => {
    const migratedDoc: SavedObjectUnsanitizedDoc<any> = migrateControlGroup(
      {
        attributes: { title: 'test dashboard ' },
      } as SavedObjectUnsanitizedDoc<DashboardAttributes>,
      savedObjectMigrationContext
    );
    expect(migratedDoc).toEqual({
      attributes: { title: 'test dashboard ' },
    });
  });

  test('should migrate single options list control', () => {
    const migratedDoc: SavedObjectUnsanitizedDoc<any> = migrateControlGroup(
      getControlGroupDoc({
        testPanelId: getOptionsListControl(0, { id: 'testPanelId', hideExclude: true }),
      }) as SavedObjectUnsanitizedDoc<DashboardAttributes>,
      savedObjectMigrationContext
    );
    const migratedSearchSource = JSON.parse(migratedDoc.attributes.controlGroupInput.panelsJSON);

    expect(migratedSearchSource).toEqual({
      testPanelId: getOptionsListControl(0, { id: 'testPanelId' }),
    });
  });

  test('should migrate multiple options list controls', () => {
    const migratedDoc: SavedObjectUnsanitizedDoc<any> = migrateControlGroup(
      getControlGroupDoc({
        testPanelId1: getOptionsListControl(0, { id: 'testPanelId1' }),
        testPanelId2: getOptionsListControl(1, { id: 'testPanelId2', hideExclude: false }),
        testPanelId3: getOptionsListControl(2, { id: 'testPanelId3', hideExists: true }),
        testPanelId4: getOptionsListControl(3, {
          id: 'testPanelId4',
          hideExclude: true,
          hideExists: false,
        }),
        testPanelId5: getOptionsListControl(4, {
          id: 'testPanelId5',
          hideExists: true,
          hideExclude: false,
          singleSelect: true,
          runPastTimeout: true,
          selectedOptions: ['test'],
        }),
      }) as SavedObjectUnsanitizedDoc<DashboardAttributes>,
      savedObjectMigrationContext
    );
    const migratedSearchSource = JSON.parse(migratedDoc.attributes.controlGroupInput.panelsJSON);

    expect(migratedSearchSource).toEqual({
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
    const migratedDoc: SavedObjectUnsanitizedDoc<any> = migrateControlGroup(
      getControlGroupDoc({
        testPanelId1: getOptionsListControl(0, {
          id: 'testPanelId1',
          hideExists: true,
          hideExclude: true,
          runPastTimeout: true,
        }),
        testPanelId2: getRangeSliderControl(1, { id: 'testPanelId2' }),
      }) as SavedObjectUnsanitizedDoc<DashboardAttributes>,
      savedObjectMigrationContext
    );
    const migratedSearchSource = JSON.parse(migratedDoc.attributes.controlGroupInput.panelsJSON);

    expect(migratedSearchSource).toEqual({
      testPanelId1: getOptionsListControl(0, { id: 'testPanelId1', runPastTimeout: true }),
      testPanelId2: getRangeSliderControl(1, { id: 'testPanelId2' }),
    });
  });
});
