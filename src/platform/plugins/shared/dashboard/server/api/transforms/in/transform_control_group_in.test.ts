/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
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
  const mockControlsGroupState: ControlsGroupState = {
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
        // @ts-expect-error Test type
        type: 'type1',
        width: CONTROL_WIDTH_SMALL,
        bizz: 'buzz',
        order: 0,
        grow: false,
      },
      {
        // @ts-expect-error Test type
        type: 'type2',
        grow: true,
        width: CONTROL_WIDTH_SMALL,
        boo: 'bear',
        order: 1,
      },
    ],
  };

  it('should return empty references if controlsGroupState is undefined', () => {
    const result = transformControlGroupIn(undefined);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "references": Array [],
      }
    `);
  });

  it('should transform controlsGroupState correctly', () => {
    const result = transformControlGroupIn(mockControlsGroupState);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "controlsJSON": "{\\"control1\\":{\\"order\\":0,\\"type\\":\\"type1\\",\\"width\\":\\"small\\",\\"grow\\":false,\\"explicitInput\\":{\\"id\\":\\"control1\\",\\"bizz\\":\\"buzz\\",\\"order\\":0}},\\"mock-uuid\\":{\\"order\\":1,\\"type\\":\\"type2\\",\\"width\\":\\"small\\",\\"grow\\":true,\\"explicitInput\\":{\\"id\\":\\"mock-uuid\\",\\"boo\\":\\"bear\\",\\"order\\":1}}}",
        "references": Array [],
      }
    `);
  });

  it('should handle empty controls array', () => {
    const controlsGroupState: ControlsGroupState = {
      ...mockControlsGroupState,
      controls: [],
    };

    const result = transformControlGroupIn(controlsGroupState);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "controlsJSON": "{}",
        "references": Array [],
      }
    `);
  });
});
