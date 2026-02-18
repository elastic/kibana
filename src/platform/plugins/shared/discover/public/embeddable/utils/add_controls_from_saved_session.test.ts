/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { addControlsFromSavedSession } from './add_controls_from_saved_session';
import type { ControlGroupRendererApi } from '@kbn/control-group-renderer';

describe('addControlsFromSavedSession', () => {
  let mockContainer: CanAddNewPanel & PublishesESQLVariables & { controlGroupApi$?: unknown };
  let mockControlGroupApi: jest.Mocked<ControlGroupRendererApi>;
  let mockControlGroupApi$: BehaviorSubject<jest.Mocked<ControlGroupRendererApi>>;
  let mockEsqlVariables$: BehaviorSubject<ESQLControlVariable[]>;

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
  });

  describe('when controlGroupJson is empty or missing', () => {
    it('should return early when controlGroupJson parses to empty object', async () => {
      await addControlsFromSavedSession(mockContainer, '{}');
      expect(mockContainer.addNewPanel).not.toHaveBeenCalled();
    });
  });

  describe('when container does not support ESQL variables', () => {
    it('should return early when container does not publish ESQL variables', async () => {
      const containerWithoutESQL = {
        addNewPanel: jest.fn(),
        controlGroupApi$: mockControlGroupApi$,
      };

      await addControlsFromSavedSession(
        containerWithoutESQL,
        JSON.stringify({
          panel1: { variableName: 'var1', type: 'control' },
        })
      );
      expect(mockContainer.addNewPanel).not.toHaveBeenCalled();
    });

    it('should return early when controlGroupJson is empty string', () => {
      addControlsFromSavedSession(mockContainer, '');
      expect(mockControlGroupApi.addNewPanel).not.toHaveBeenCalled();
    });

    it('should return early when container does not have controlGroupApi$', async () => {
      const containerWithoutControlGroup = {
        addNewPanel: jest.fn(),
        esqlVariables$: mockEsqlVariables$,
      };

      await addControlsFromSavedSession(
        containerWithoutControlGroup,
        JSON.stringify({
          panel1: { variableName: 'var1', type: 'control' },
        })
      );
      expect(mockContainer.addNewPanel).not.toHaveBeenCalled();
    });
  });

  describe('when adding controls', () => {
    const controlGroupJson = JSON.stringify({
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
    });

    it('should add controls only for variables that dont exist in esqlVariables', async () => {
      await addControlsFromSavedSession(mockContainer, controlGroupJson, 'test-uuid');

      expect(mockContainer.addNewPanel).toHaveBeenCalledTimes(1);

      expect(mockContainer.addNewPanel).toHaveBeenCalledWith(
        {
          panelType: ESQL_CONTROL,
          serializedState: {
            variableName: 'nonExistentVar',
            type: 'control',
          },
        },
        { beside: 'test-uuid', scrollToPanel: false }
      );
    });

    it('should not add controls for variables that do not exist in esqlVariables', async () => {
      await addControlsFromSavedSession(mockContainer, controlGroupJson);

      const addedPanels = (
        mockContainer.addNewPanel as jest.MockedFunction<CanAddNewPanel['addNewPanel']>
      ).mock.calls.map(
        (call) => (call[0]?.serializedState as { variableName?: string })?.variableName
      );

      expect(addedPanels).not.toContain(['var1', 'var2']);
      expect(addedPanels).toEqual(['nonExistentVar']);
    });
  });
});
