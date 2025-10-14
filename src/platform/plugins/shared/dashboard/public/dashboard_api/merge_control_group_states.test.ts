/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { controlHasVariableName } from '@kbn/esql-types';
import { mergeControlGroupStates } from './merge_control_group_states';

describe('mergeControlGroupStates', () => {
  const createMockControl = (variableName: string, id: string = `control-${variableName}`) => ({
    id,
    controlConfig: {
      variableName,
      title: `Control for ${variableName}`,
    },
    order: 0,
    width: 'medium' as const,
    grow: false,
    type: 'esqlControl',
  });
  const createMockControlGroupState = (
    controls: ControlsGroupState['controls']
  ): ControlsGroupState => ({
    controls,
    labelPosition: 'oneLine',
    chainingSystem: 'HIERARCHICAL',
    autoApplySelections: true,
    ignoreParentSettings: {
      ignoreFilters: false,
      ignoreQuery: false,
      ignoreTimerange: false,
      ignoreValidations: false,
    },
  });

  const createMockEmbeddablePackage = (
    controlGroupState: ControlsGroupState
  ): EmbeddablePackageState => ({
    type: 'controls',
    serializedState: {
      rawState: controlGroupState,
    },
  });

  describe('when both initial and incoming states exist', () => {
    it('should merge unique controls based on variable names', () => {
      const initialState = createMockControlGroupState([
        createMockControl('existingVar1'),
        createMockControl('existingVar2'),
      ]);

      const incomingState = createMockControlGroupState([
        createMockControl('newVar1'),
        createMockControl('newVar2'),
      ]);

      const incomingPackage = createMockEmbeddablePackage(incomingState);

      const result = mergeControlGroupStates(initialState, incomingPackage);

      expect(result).toBeDefined();
      expect(result!.controls).toHaveLength(4);
      expect(
        result!.controls.map(
          (c) => controlHasVariableName(c.controlConfig) && c.controlConfig?.variableName
        )
      ).toEqual(['newVar1', 'newVar2', 'existingVar1', 'existingVar2']);
    });

    it('should not add duplicate controls with same variable names', () => {
      const initialState = createMockControlGroupState([
        createMockControl('sharedVar'),
        createMockControl('uniqueVar1'),
      ]);

      const incomingState = createMockControlGroupState([
        createMockControl('sharedVar', 'different-control-id'),
        createMockControl('uniqueVar2'),
      ]);

      const incomingPackage = createMockEmbeddablePackage(incomingState);

      const result = mergeControlGroupStates(initialState, incomingPackage);

      expect(result).toBeDefined();
      expect(result!.controls).toHaveLength(3);
      expect(
        result!.controls.map(
          (c) => controlHasVariableName(c.controlConfig) && c.controlConfig?.variableName
        )
      ).toEqual(['uniqueVar2', 'sharedVar', 'uniqueVar1']);
    });

    it('should handle controls without variable names', () => {
      const controlWithoutVariableName = {
        id: 'control-no-var',
        controlConfig: {
          title: 'Control without variable name',
        },
        order: 0,
        width: 'medium' as const,
        grow: false,
        type: 'notEsqlControl',
      };

      const initialState = createMockControlGroupState([
        createMockControl('withVar'),
        controlWithoutVariableName,
      ]);

      const incomingState = createMockControlGroupState([createMockControl('newVar')]);

      const incomingPackage = createMockEmbeddablePackage(incomingState);

      const result = mergeControlGroupStates(initialState, incomingPackage);

      expect(result!.controls).toHaveLength(3);
      expect(result!.controls.map((c) => c.id)).toEqual([
        'control-newVar',
        'control-withVar',
        'control-no-var',
      ]);
    });
  });

  describe('when only initial state exists', () => {
    it('should return the initial state unchanged', () => {
      const initialState = createMockControlGroupState([
        createMockControl('var1'),
        createMockControl('var2'),
      ]);

      const result = mergeControlGroupStates(initialState, undefined);

      expect(result).toEqual(initialState);
    });
  });

  describe('when only incoming state exists', () => {
    it('should return the incoming state', () => {
      const incomingState = createMockControlGroupState([
        createMockControl('var1'),
        createMockControl('var2'),
      ]);

      const incomingPackage = createMockEmbeddablePackage(incomingState);

      const result = mergeControlGroupStates(undefined, incomingPackage);

      expect(result).toEqual(incomingState);
    });
  });
});
