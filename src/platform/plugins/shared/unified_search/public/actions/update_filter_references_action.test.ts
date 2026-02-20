/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { triggers } from '@kbn/ui-actions-plugin/public';
import { UPDATE_FILTER_REFERENCES_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UpdateFilterReferencesActionContext } from './update_filter_references_action';
import { createUpdateFilterReferencesAction } from './update_filter_references_action';
import { mockFilter } from '../mocks/get_stub_filter';

describe('createUpdateFilterReferencesAction', () => {
  let filterManager: FilterManager;
  let executeActionFn: (context: UpdateFilterReferencesActionContext) => Promise<void>;
  const trigger = triggers[UPDATE_FILTER_REFERENCES_TRIGGER];

  beforeEach(async () => {
    filterManager = new FilterManager(coreMock.createStart().uiSettings);
    executeActionFn = createUpdateFilterReferencesAction(filterManager).execute;
  });

  /**
   Scenario: Change filter reference when adjusting 1 layer
     Given I am configuring one layer: L1 by D1 data view
     Given I am adding a filter F1 by D1
     When I change D1 to D2 on L1
     Then Data view reference for F1 should be updated to D2
   **/
  test('Scenario: Change filter reference when adjusting 1 layer', async () => {
    const f1 = mockFilter('D1', FilterStateStore.GLOBAL_STATE, true, true, 'f1', '');
    filterManager.setFilters([f1]);

    await executeActionFn({
      trigger,
      fromDataView: 'D1',
      toDataView: 'D2',
      usedDataViews: ['D1'],
    });

    expect(filterManager.getFilters().map(({ meta }) => meta.index)).toMatchInlineSnapshot(`
      Array [
        "D2",
      ]
    `);
  });

  /**
   Scenario: Change filter reference when adjusting 2 or more layers
     Given I am configuring 2 layers: L1 by D1 + L2 by D2
     Given I am adding 2 filters: F1 by D1 + F2 by D2
     When I change D1 to D3 on L1
     Then Data view reference for F1 should be updated to D3
   **/
  test('Scenario: Change filter reference when adjusting 2 or more layers', async () => {
    const f1 = mockFilter('D1', FilterStateStore.GLOBAL_STATE, true, true, 'f1', '');
    const f2 = mockFilter('D2', FilterStateStore.GLOBAL_STATE, true, true, 'f2', '');
    filterManager.setFilters([f1, f2]);

    await executeActionFn({
      trigger,
      fromDataView: 'D1',
      toDataView: 'D3',
      usedDataViews: ['D1', 'D2'],
    });

    expect(filterManager.getFilters().map(({ meta }) => meta.index)).toMatchInlineSnapshot(`
      Array [
        "D3",
        "D2",
      ]
    `);
  });

  /**
    Scenario: change references only for incompatible cases.
      Given I am configuring 3 layers: L1 by D1 + L2 by D1 + L3 by D2
      Given I am adding 2 filters: F1 by D1 + F2 by D2
      When I change D1 to D2 on L1
      Then Data view reference should not be updated
      Note: Important case!
   **/
  test('Scenario: change references only for incompatible cases', async () => {
    const f1 = mockFilter('D1', FilterStateStore.GLOBAL_STATE, true, true, 'f1', '');
    const f2 = mockFilter('D2', FilterStateStore.GLOBAL_STATE, true, true, 'f2', '');
    filterManager.setFilters([f1, f2]);

    await executeActionFn({
      trigger,
      fromDataView: 'D1',
      toDataView: 'D3',
      usedDataViews: ['D1', 'D1', 'D2'],
    });

    expect(filterManager.getFilters().map(({ meta }) => meta.index)).toMatchInlineSnapshot(`
      Array [
        "D1",
        "D2",
      ]
    `);
  });

  /**
  Scenario: Change filter reference when removing one of configured layers
    Given I am configuring 2 layers: L1 by D1 + L2 by D2
    Given I am adding 2 filters: F1 by D1 + F2 by D2
    When I remove L1
    Then Data view reference for F1 should be updated to D2
    Note: should take the first of the available configured Data Views
   **/
  test('Scenario: Change filter reference when removing one of configured layers', async () => {
    const f1 = mockFilter('D1', FilterStateStore.GLOBAL_STATE, true, true, 'f1', '');
    const f2 = mockFilter('D2', FilterStateStore.GLOBAL_STATE, true, true, 'f2', '');
    filterManager.setFilters([f1, f2]);

    await executeActionFn({
      trigger,
      fromDataView: 'D1',
      toDataView: undefined,
      usedDataViews: ['D1', 'D2'],
    });

    expect(filterManager.getFilters().map(({ meta }) => meta.index)).toMatchInlineSnapshot(`
      Array [
        "D2",
        "D2",
      ]
    `);
  });

  /**
   Scenario: Change filter reference when removing all layers (one layer was configured)
     Given I am configuring one layer: L1 by D1
     Given I am adding a filter F1 by D1
     Given I am changing the Unified Search Data View to D2
     When I remove all layers
     Then Data view reference for F1 should be updated to D2
     Note: Unified Search Data View should be used by default
   **/
  test('Scenario: Change filter reference when removing all layers (one layer was configured)', async () => {
    const f1 = mockFilter('D1', FilterStateStore.GLOBAL_STATE, true, true, 'f1', '');
    filterManager.setFilters([f1]);

    await executeActionFn({
      trigger,
      fromDataView: 'D1',
      toDataView: undefined,
      usedDataViews: ['D1'],
      defaultDataView: 'D2',
    });

    expect(filterManager.getFilters().map(({ meta }) => meta.index)).toMatchInlineSnapshot(`
      Array [
        "D2",
      ]
    `);
  });
});
