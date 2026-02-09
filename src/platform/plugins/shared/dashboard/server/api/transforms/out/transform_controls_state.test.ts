/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_CONTROL_WIDTH,
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { StoredControlGroupInput } from '../../../dashboard_saved_object';
import {
  transformControlObjectToArray,
  transformControlProperties,
  transformControlsState,
} from './transform_controls_state';

jest.mock('../../../kibana_services', () => ({
  ...jest.requireActual('../../../kibana_services'),
  embeddableService: {
    getTransforms: jest.fn(),
  },
}));

describe('control_state', () => {
  const mockControls = {
    control1: {
      type: 'optionsListControl',
      width: 'medium',
      explicitInput: { foo: 'bar' },
      order: 0,
    },
    control2: {
      type: 'rangeSliderControl',
      width: 'small',
      explicitInput: { bizz: 'buzz' },
      order: 1,
    },
    control3: {
      type: 'esqlControl',
      grow: true,
      explicitInput: { boo: 'bear' },
      unsupportedProperty: 'unsupported',
      order: 2,
    },
  } as StoredControlGroupInput['panels'];

  describe('transformControlObjectToArray', () => {
    it('should transform control object to array', () => {
      const result = transformControlObjectToArray(mockControls);
      expect(result).toHaveLength(3);
      expect(result).toHaveProperty('0.id', 'control1');
      expect(result).toHaveProperty('1.id', 'control2');
      expect(result).toHaveProperty('2.id', 'control3');
    });
  });

  describe('transformControlExplicitInput', () => {
    it('should transform controls explicit input', () => {
      const controlsArray = transformControlObjectToArray(mockControls);
      const result = transformControlProperties(controlsArray);

      expect(result).toHaveProperty('0.config.foo', 'bar');
      expect(result).not.toHaveProperty('0.explicitInput');

      expect(result).toHaveProperty('1.config.bizz', 'buzz');
      expect(result).not.toHaveProperty('1.explicitInput');

      expect(result).toHaveProperty('2.config.boo', 'bear');
      expect(result).not.toHaveProperty('2.explicitInput');
      expect(result).not.toHaveProperty('2.unsupportedProperty');
      expect(result).not.toHaveProperty('2.config.unsupportedProperty');
    });
  });

  describe('transformControlsState', () => {
    it('should transform serialized control state to array with all transformations applied', () => {
      const serializedControlState = JSON.stringify(mockControls);
      const result = transformControlsState(serializedControlState, []);
      expect(result).toEqual([
        {
          uid: 'control1',
          type: OPTIONS_LIST_CONTROL,
          width: DEFAULT_CONTROL_WIDTH,
          config: {
            foo: 'bar',
          },
        },
        {
          uid: 'control2',
          type: RANGE_SLIDER_CONTROL,
          width: 'small',
          config: {
            bizz: 'buzz',
          },
        },
        {
          uid: 'control3',
          type: ESQL_CONTROL,
          grow: true,
          config: {
            boo: 'bear',
          },
        },
      ]);
    });
  });
});
