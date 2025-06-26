/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import {
  transformControlObjectToArray,
  transformControlsWidthAuto,
  transformControlProperties,
  transformControlsSetDefaults,
  transformControlsState,
} from './control_state_out_transforms';

describe('control_state', () => {
  const mockControls = {
    control1: { type: 'type1', width: 'auto', explicitInput: { foo: 'bar' } },
    control2: { type: 'type2', width: 'small', explicitInput: { bizz: 'buzz' } },
    control3: {
      type: 'type3',
      grow: true,
      explicitInput: { boo: 'bear' },
      unsupportedProperty: 'unsupported',
    },
  };

  describe('transformControlObjectToArray', () => {
    it('should transform control object to array', () => {
      const result = transformControlObjectToArray(mockControls);
      expect(result).toHaveLength(3);
      expect(result).toHaveProperty('0.id', 'control1');
      expect(result).toHaveProperty('1.id', 'control2');
      expect(result).toHaveProperty('2.id', 'control3');
    });
  });

  describe('transformControlsWidthAuto', () => {
    it('should transform controls with width auto to default width and grow = true', () => {
      const controlsArray = transformControlObjectToArray(mockControls);
      const result = transformControlsWidthAuto(controlsArray);
      expect(result).toHaveProperty('0.width', DEFAULT_CONTROL_WIDTH);
      expect(result).toHaveProperty('0.grow', true);
    });
  });

  describe('transformControlExplicitInput', () => {
    it('should transform controls explicit input', () => {
      const controlsArray = transformControlObjectToArray(mockControls);
      const result = transformControlProperties(controlsArray);
      expect(result).toHaveProperty('0.controlConfig', { foo: 'bar' });
      expect(result).not.toHaveProperty('0.explicitInput');

      expect(result).toHaveProperty('1.controlConfig', { bizz: 'buzz' });
      expect(result).not.toHaveProperty('1.explicitInput');

      expect(result).toHaveProperty('2.controlConfig', { boo: 'bear' });
      expect(result).not.toHaveProperty('2.explicitInput');
      expect(result).not.toHaveProperty('2.unsupportedProperty');
    });
  });

  describe('transformControlsSetDefaults', () => {
    it('should set default values for controls', () => {
      const controlsArray = transformControlObjectToArray(mockControls);
      const result = transformControlsSetDefaults(controlsArray);
      expect(result).toHaveProperty('1.grow', DEFAULT_CONTROL_GROW);
      expect(result).toHaveProperty('2.width', DEFAULT_CONTROL_WIDTH);
    });
  });

  describe('transformControlsState', () => {
    it('should transform serialized control state to array with all transformations applied', () => {
      const serializedControlState = JSON.stringify(mockControls);
      const result = transformControlsState(serializedControlState);
      expect(result).toEqual([
        {
          id: 'control1',
          type: 'type1',
          width: DEFAULT_CONTROL_WIDTH,
          grow: true,
          controlConfig: { foo: 'bar' },
        },
        {
          id: 'control2',
          type: 'type2',
          width: 'small',
          grow: DEFAULT_CONTROL_GROW,
          controlConfig: { bizz: 'buzz' },
        },
        {
          id: 'control3',
          type: 'type3',
          width: DEFAULT_CONTROL_WIDTH,
          grow: true,
          controlConfig: { boo: 'bear' },
        },
      ]);
    });
  });
});
