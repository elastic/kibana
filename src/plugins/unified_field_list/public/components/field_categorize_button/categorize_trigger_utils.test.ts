/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { canCategorize } from './categorize_trigger_utils';

const textField = {
  name: 'fieldName',
  type: 'string',
  esTypes: ['text'],
  count: 1,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  visualizable: true,
} as DataViewField;

const numberField = {
  name: 'fieldName',
  type: 'number',
  esTypes: ['double'],
  count: 1,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  visualizable: true,
} as DataViewField;

const mockGetActions = jest.fn<Promise<Array<Action<object>>>, [string, { fieldName: string }]>(
  () => Promise.resolve([])
);

const uiActions = {
  getTriggerCompatibleActions: mockGetActions,
} as unknown as UiActionsStart;

const action: Action = {
  id: 'action',
  type: 'CATEGORIZE_FIELD',
  getIconType: () => undefined,
  getDisplayName: () => 'Action',
  isCompatible: () => Promise.resolve(true),
  execute: () => Promise.resolve(),
};

const dataViewMock = { id: '1', toSpec: () => ({}) } as DataView;

describe('categorize_trigger_utils', () => {
  afterEach(() => {
    mockGetActions.mockReset();
  });

  describe('getCategorizeInformation', () => {
    it('should return true for a categorizable field with an action', async () => {
      mockGetActions.mockResolvedValue([action]);
      const resp = await canCategorize(uiActions, textField, dataViewMock);
      expect(resp).toBe(true);
    });

    it('should return false for a non-categorizable field with an action', async () => {
      mockGetActions.mockResolvedValue([action]);
      const resp = await canCategorize(uiActions, numberField, dataViewMock);
      expect(resp).toBe(false);
    });
  });
});
