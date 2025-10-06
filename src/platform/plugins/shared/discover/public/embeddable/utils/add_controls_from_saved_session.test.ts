/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CanAddNewPanel } from '@kbn/presentation-containers';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { type ESQLControlState, type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import type { ControlPanelsState } from '@kbn/controls-plugin/public';
import { type ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { addControlsFromSavedSession } from './add_controls_from_saved_session';

describe('addControlsFromSavedSession', () => {
  let mockContainer: CanAddNewPanel & { controlGroupApi$?: unknown; esqlVariables$?: unknown };
  let mockControlGroupApi: jest.Mocked<ControlGroupRendererApi>;
  let mockControlGroupApi$: BehaviorSubject<jest.Mocked<ControlGroupRendererApi>>;
  let mockEsqlVariables$: BehaviorSubject<ESQLControlVariable[]>;
  let savedObject: SavedObjectCommon<SavedSearchAttributes>;

  beforeEach(() => {
    mockControlGroupApi = {
      addNewPanel: jest.fn(),
    } as unknown as jest.Mocked<ControlGroupRendererApi>;

    mockControlGroupApi$ = new BehaviorSubject(mockControlGroupApi);
    mockEsqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([
      { key: 'var1', value: 'value1', type: ESQLVariableType.VALUES },
      { key: 'var2', value: 'value2', type: ESQLVariableType.FIELDS },
    ]);

    mockContainer = {
      controlGroupApi$: mockControlGroupApi$,
      esqlVariables$: mockEsqlVariables$,
      addNewPanel: jest.fn(),
    };

    savedObject = {
      id: 'test-saved-search',
      attributes: {
        title: 'Test Search',
        columns: [],
        sort: [],
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    } as unknown as SavedObjectCommon<SavedSearchAttributes>;
  });

  describe('when controlGroupJson is empty or missing', () => {
    it('should return early when controlGroupJson is undefined', () => {
      addControlsFromSavedSession(mockContainer, savedObject);
      expect(mockControlGroupApi.addNewPanel).not.toHaveBeenCalled();
    });

    it('should return early when controlGroupJson is empty string', () => {
      savedObject.attributes.controlGroupJson = '';
      addControlsFromSavedSession(mockContainer, savedObject);
      expect(mockControlGroupApi.addNewPanel).not.toHaveBeenCalled();
    });

    it('should return early when controlGroupJson parses to empty object', () => {
      savedObject.attributes.controlGroupJson = '{}';
      addControlsFromSavedSession(mockContainer, savedObject);
      expect(mockControlGroupApi.addNewPanel).not.toHaveBeenCalled();
    });
  });

  describe('when container does not support ESQL variables', () => {
    it('should return early when container does not publish ESQL variables', () => {
      const containerWithoutESQL = {
        addNewPanel: jest.fn(),
        controlGroupApi$: mockControlGroupApi$,
      };

      savedObject.attributes.controlGroupJson = JSON.stringify({
        panel1: { variableName: 'var1', type: 'control' },
      });

      addControlsFromSavedSession(containerWithoutESQL, savedObject);
      expect(mockControlGroupApi.addNewPanel).not.toHaveBeenCalled();
    });

    it('should return early when container does not have controlGroupApi$', () => {
      const containerWithoutControlGroup = {
        addNewPanel: jest.fn(),
        esqlVariables$: mockEsqlVariables$,
      };

      savedObject.attributes.controlGroupJson = JSON.stringify({
        panel1: { variableName: 'var1', type: 'control' },
      });

      addControlsFromSavedSession(containerWithoutControlGroup, savedObject);
      expect(mockControlGroupApi.addNewPanel).not.toHaveBeenCalled();
    });
  });

  describe('when adding controls', () => {
    beforeEach(() => {
      const controlsState = {
        panel1: {
          type: 'control',
          order: 0,
          variableName: 'var1',
        },
        panel2: {
          type: 'control',
          order: 1,
          variableName: 'var2',
        },
        panel3: {
          type: 'control',
          order: 2,
          variableName: 'nonExistentVar',
        },
      } as unknown as ControlPanelsState<ESQLControlState>;

      savedObject.attributes.controlGroupJson = JSON.stringify(controlsState);
    });

    it('should add controls only for variables that dont exist in esqlVariables', () => {
      addControlsFromSavedSession(mockContainer, savedObject);

      expect(mockControlGroupApi.addNewPanel).toHaveBeenCalledTimes(1);

      expect(mockControlGroupApi.addNewPanel).toHaveBeenCalledWith({
        panelType: ESQL_CONTROL,
        serializedState: {
          rawState: {
            variableName: 'nonExistentVar',
            type: 'control',
            order: 2,
          },
        },
      });
    });

    it('should not add controls for variables that do not exist in esqlVariables', () => {
      addControlsFromSavedSession(mockContainer, savedObject);

      const addedPanels = mockControlGroupApi.addNewPanel.mock.calls.map(
        (call) => (call[0]?.serializedState?.rawState as { variableName?: string })?.variableName
      );

      expect(addedPanels).not.toContain(['var1', 'var2']);
      expect(addedPanels).toEqual(['nonExistentVar']);
    });
  });
});
