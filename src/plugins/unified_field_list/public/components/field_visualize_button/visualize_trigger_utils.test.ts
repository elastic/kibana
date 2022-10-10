/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { getVisualizeInformation } from './visualize_trigger_utils';

const field = {
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

const mockGetActions = jest.fn<Promise<Array<Action<object>>>, [string, { fieldName: string }]>(
  () => Promise.resolve([])
);

const uiActions = {
  getTriggerCompatibleActions: mockGetActions,
} as unknown as UiActionsStart;

const action: Action = {
  id: 'action',
  type: 'VISUALIZE_FIELD',
  getIconType: () => undefined,
  getDisplayName: () => 'Action',
  isCompatible: () => Promise.resolve(true),
  execute: () => Promise.resolve(),
};

const dataViewMock = { id: '1', toSpec: () => ({}) } as DataView;

describe('visualize_trigger_utils', () => {
  afterEach(() => {
    mockGetActions.mockReset();
  });

  describe('getVisualizeInformation', () => {
    it('should return for a visualizeable field with an action', async () => {
      mockGetActions.mockResolvedValue([action]);
      const information = await getVisualizeInformation(
        uiActions,
        field,
        dataViewMock,
        [],
        undefined
      );
      expect(information).not.toBeUndefined();
      expect(information?.field).toHaveProperty('name', 'fieldName');
      expect(information?.href).toBeUndefined();
    });

    it('should return field and href from the action', async () => {
      mockGetActions.mockResolvedValue([{ ...action, getHref: () => Promise.resolve('hreflink') }]);
      const information = await getVisualizeInformation(
        uiActions,
        field,
        dataViewMock,
        [],
        undefined
      );
      expect(information).not.toBeUndefined();
      expect(information?.field).toHaveProperty('name', 'fieldName');
      expect(information).toHaveProperty('href', 'hreflink');
    });

    it('should return undefined if no field has a compatible action', async () => {
      mockGetActions.mockResolvedValue([]);
      const information = await getVisualizeInformation(
        uiActions,
        { ...field, name: 'rootField' } as DataViewField,
        dataViewMock,
        [],
        [
          { ...field, name: 'multi1' },
          { ...field, name: 'multi2' },
        ] as DataViewField[]
      );
      expect(information).toBeUndefined();
    });

    it('should return information for the root field, when multi fields and root are having actions', async () => {
      mockGetActions.mockResolvedValue([action]);
      const information = await getVisualizeInformation(
        uiActions,
        { ...field, name: 'rootField' } as DataViewField,
        dataViewMock,
        [],
        [
          { ...field, name: 'multi1' },
          { ...field, name: 'multi2' },
        ] as DataViewField[]
      );
      expect(information).not.toBeUndefined();
      expect(information?.field).toHaveProperty('name', 'rootField');
    });

    it('should return information for first multi field that has a compatible action', async () => {
      mockGetActions.mockImplementation(async (_, { fieldName }) => {
        if (fieldName === 'multi2' || fieldName === 'multi3') {
          return [action];
        }
        return [];
      });
      const information = await getVisualizeInformation(
        uiActions,
        { ...field, name: 'rootField' } as DataViewField,
        dataViewMock,
        [],
        [
          { ...field, name: 'multi1' },
          { ...field, name: 'multi2' },
          { ...field, name: 'multi3' },
        ] as DataViewField[]
      );
      expect(information).not.toBeUndefined();
      expect(information?.field).toHaveProperty('name', 'multi2');
    });
  });
});
