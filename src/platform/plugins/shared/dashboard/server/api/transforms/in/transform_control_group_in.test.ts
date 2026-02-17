/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState, PinnedControlState } from '@kbn/controls-schemas';
import { transformControlGroupIn } from './transform_control_group_in';
import { CONTROL_WIDTH_SMALL } from '@kbn/controls-constants';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));
jest.mock('../../../kibana_services', () => ({
  ...jest.requireActual('../../../kibana_services'),
  embeddableService: {
    getTransforms: jest.fn(),
  },
}));

describe('transformControlGroupIn', () => {
  const mockControlsGroupState: ControlsGroupState = [
    {
      uid: 'control1',
      type: 'type1',
      width: CONTROL_WIDTH_SMALL,
      config: { bizz: 'buzz' },
      grow: false,
    } as unknown as PinnedControlState,
    {
      type: 'type2',
      grow: true,
      width: CONTROL_WIDTH_SMALL,
      config: { boo: 'bear' },
    } as unknown as PinnedControlState,
  ];

  it('should return empty references if controlsGroupState is undefined', () => {
    const result = transformControlGroupIn(undefined);
    expect(result.references).toEqual([]);
  });

  it('should transform controlsGroupState correctly', () => {
    const result = transformControlGroupIn(mockControlsGroupState);

    expect(result.controlsJSON).toEqual(
      JSON.stringify({
        control1: {
          order: 0,
          type: 'type1',
          width: 'small',
          grow: false,
          explicitInput: { bizz: 'buzz' },
        },
        'mock-uuid': {
          order: 1,
          type: 'type2',
          width: 'small',
          grow: true,
          explicitInput: { boo: 'bear' },
        },
      })
    );
  });

  it('should handle empty controls array', () => {
    const controlsGroupState: ControlsGroupState = [];

    const result = transformControlGroupIn(controlsGroupState);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "controlsJSON": "{}",
        "references": Array [],
      }
    `);
  });
});
