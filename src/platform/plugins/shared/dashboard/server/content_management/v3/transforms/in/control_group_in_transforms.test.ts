/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformControlGroupIn } from './control_group_in_transforms';
import { ControlGroupAttributes } from '../../types';
import { CONTROL_WIDTH_OPTIONS } from '@kbn/controls-plugin/common';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('transformControlGroupIn', () => {
  const mockControlGroupInput: ControlGroupAttributes = {
    chainingSystem: 'NONE',
    labelPosition: 'oneLine',
    autoApplySelections: true,
    ignoreParentSettings: {
      ignoreFilters: true,
      ignoreQuery: true,
      ignoreTimerange: true,
      ignoreValidations: true,
    },
    controls: [
      {
        id: 'control1',
        type: 'type1',
        width: CONTROL_WIDTH_OPTIONS.SMALL,
        controlConfig: { bizz: 'buzz' },
        order: 0,
        grow: false,
      },
      {
        type: 'type2',
        grow: true,
        width: CONTROL_WIDTH_OPTIONS.SMALL,
        controlConfig: { boo: 'bear' },
        order: 1,
      },
    ],
  };

  it('should return undefined if controlGroupInput is undefined', () => {
    const result = transformControlGroupIn(undefined);
    expect(result).toBeUndefined();
  });

  it('should transform controlGroupInput correctly', () => {
    const result = transformControlGroupIn(mockControlGroupInput);

    expect(result).toEqual({
      chainingSystem: 'NONE',
      controlStyle: 'oneLine',
      showApplySelections: false,
      ignoreParentSettingsJSON: JSON.stringify({
        ignoreFilters: true,
        ignoreQuery: true,
        ignoreTimerange: true,
        ignoreValidations: true,
      }),
      panelsJSON: JSON.stringify({
        control1: {
          type: 'type1',
          width: 'small',
          order: 0,
          grow: false,
          explicitInput: { bizz: 'buzz' },
        },
        'mock-uuid': {
          type: 'type2',
          grow: true,
          width: 'small',
          order: 1,
          explicitInput: { boo: 'bear' },
        },
      }),
    });
  });

  it('should handle empty controls array', () => {
    const controlGroupInput: ControlGroupAttributes = {
      ...mockControlGroupInput,
      controls: [],
    };

    const result = transformControlGroupIn(controlGroupInput);

    expect(result).toEqual({
      chainingSystem: 'NONE',
      controlStyle: 'oneLine',
      showApplySelections: false,
      ignoreParentSettingsJSON: JSON.stringify({
        ignoreFilters: true,
        ignoreQuery: true,
        ignoreTimerange: true,
        ignoreValidations: true,
      }),
      panelsJSON: JSON.stringify({}),
    });
  });
});
