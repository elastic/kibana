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
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import {
  transformPinnedPanelProperties,
  transformPinnedPanelsObjectToArray,
  transformPinnedPanelsOut,
} from './transform_pinned_panels_out';
import type { DashboardState } from '../../types';

jest.mock('../../../kibana_services', () => ({
  ...jest.requireActual('../../../kibana_services'),
  embeddableService: {
    getTransforms: jest.fn(),
  },
}));

describe('pinned panels', () => {
  const mockPinnedPanels = {
    control1: {
      id: 'control1',
      type: 'optionsListControl',
      width: 'medium',
      config: { foo: 'bar' },
      order: 0,
    },
    control2: {
      id: 'control2',
      type: 'rangeSliderControl',
      width: 'small',
      config: { bizz: 'buzz' },
      order: 1,
    },
    control3: {
      id: 'control3',
      type: 'esqlControl',
      grow: true,
      config: { boo: 'bear' },
      unsupportedProperty: 'unsupported',
      order: 2,
    },
  } as Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];

  const transformedPinnedPanels = [
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
  ] as unknown as DashboardState['pinned_panels'];

  it('should transform pinned panels object to array with all transformations applied', () => {
    const result = transformPinnedPanelsOut(undefined, { panels: mockPinnedPanels }, []);
    expect(result).toEqual(transformedPinnedPanels);
  });

  it('should transform pinned panels object to array', () => {
    const result = transformPinnedPanelsObjectToArray(mockPinnedPanels);
    expect(result).toHaveLength(3);
    expect(result).toHaveProperty('0.id', 'control1');
    expect(result).toHaveProperty('1.id', 'control2');
    expect(result).toHaveProperty('2.id', 'control3');
  });

  describe('transform <9.4 legacy controls', () => {
    it('should transform controls explicit input', () => {
      const controlsArray = transformPinnedPanelsObjectToArray(mockPinnedPanels);
      const result = transformPinnedPanelProperties(controlsArray);

      expect(result).toHaveProperty('0.config.foo', 'bar');
      expect(result).not.toHaveProperty('0.explicitInput');

      expect(result).toHaveProperty('1.config.bizz', 'buzz');
      expect(result).not.toHaveProperty('1.explicitInput');

      expect(result).toHaveProperty('2.config.boo', 'bear');
      expect(result).not.toHaveProperty('2.explicitInput');
      expect(result).not.toHaveProperty('2.unsupportedProperty');
      expect(result).not.toHaveProperty('2.config.unsupportedProperty');
    });

    it('should transform serialized control state to array with all transformations applied', () => {
      const serializedControlState = { panelsJSON: JSON.stringify(mockPinnedPanels) };
      const result = transformPinnedPanelsOut(serializedControlState, undefined, []);
      expect(result).toEqual(transformedPinnedPanels);
    });
  });
});
