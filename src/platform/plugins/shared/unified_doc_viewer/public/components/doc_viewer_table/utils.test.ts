/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldRowFabricator } from './field_row.mocks';
import { getCellPositionAfterPinToggle } from './utils';

describe('getCellPositionAfterPinToggle', () => {
  describe('when the field is not pinned', () => {
    it('returns the index as 2', () => {
      const pinnedRows = [
        fieldRowFabricator({ name: 'field1' }),
        fieldRowFabricator({ name: 'field2' }),
      ];

      const result = getCellPositionAfterPinToggle({
        field: 'field3',
        pinnedRows,
        restRows: [],
      });

      expect(result).toBe(2);
    });

    it.each([
      { fieldName: 'field', fields: [], expectedIndex: 0 },
      { fieldName: 'field1', fields: ['field2', 'field3'], expectedIndex: 0 },
      { fieldName: 'field2', fields: ['field1', 'field3'], expectedIndex: 1 },
      { fieldName: 'field3', fields: ['field1', 'field2'], expectedIndex: 2 },
    ])('returns the index as $expectedIndex', ({ fieldName, fields, expectedIndex }) => {
      const pinnedRows = fields.map((name) => fieldRowFabricator({ name }));

      const result = getCellPositionAfterPinToggle({
        field: fieldName,
        pinnedRows,
        restRows: [],
      });

      expect(result).toBe(expectedIndex);
    });
  });

  describe('when the field is pinned', () => {
    it.each([
      // ONLY PINNED ROWS -- The new position is just after them
      {
        fieldName: 'field1',
        pinnedRows: [fieldRowFabricator({ name: 'field1' })],
        restRows: [],
        expectedIndex: 0,
      },
      {
        fieldName: 'field1',
        pinnedRows: [
          fieldRowFabricator({ name: 'field1' }),
          fieldRowFabricator({ name: 'field2' }),
        ],
        restRows: [],
        expectedIndex: 1,
      },
      // WITH OTHER ROWS -- Is the first non pinned row
      {
        fieldName: 'field1',
        pinnedRows: [fieldRowFabricator({ name: 'field1' })],
        restRows: [fieldRowFabricator({ name: 'field2' }), fieldRowFabricator({ name: 'field3' })],
        expectedIndex: 0,
      },
      {
        fieldName: 'field1',
        pinnedRows: [
          fieldRowFabricator({ name: 'field1' }),
          fieldRowFabricator({ name: 'field2' }),
        ],
        restRows: [fieldRowFabricator({ name: 'field3' })],
        expectedIndex: 1,
      },
      // WITH OTHER ROWS -- Goes just in between
      {
        fieldName: 'field2',
        pinnedRows: [fieldRowFabricator({ name: 'field2' })],
        restRows: [fieldRowFabricator({ name: 'field1' }), fieldRowFabricator({ name: 'field3' })],
        expectedIndex: 1,
      },
      // WITH OTHER ROWS -- Goes just to the end
      {
        fieldName: 'field3',
        pinnedRows: [fieldRowFabricator({ name: 'field3' })],
        restRows: [fieldRowFabricator({ name: 'field1' }), fieldRowFabricator({ name: 'field2' })],
        expectedIndex: 2,
      },
      // WITH OTHER ROWS + PINNED ROWS -- Goes just in between
      {
        fieldName: 'field2',
        pinnedRows: [
          fieldRowFabricator({ name: 'field0' }),
          fieldRowFabricator({ name: 'field2' }),
        ],
        restRows: [fieldRowFabricator({ name: 'field1' }), fieldRowFabricator({ name: 'field3' })],
        expectedIndex: 2,
      },
      // WITH OTHER ROWS + PINNED ROWS -- Goes just to the end
      {
        fieldName: 'field3',
        pinnedRows: [
          fieldRowFabricator({ name: 'field0' }),
          fieldRowFabricator({ name: 'field3' }),
        ],
        restRows: [fieldRowFabricator({ name: 'field1' }), fieldRowFabricator({ name: 'field2' })],
        expectedIndex: 3,
      },
    ])(
      'returns the index as $expectedIndex',
      ({ fieldName, pinnedRows, restRows, expectedIndex }) => {
        const result = getCellPositionAfterPinToggle({
          field: fieldName,
          pinnedRows,
          restRows,
        });

        expect(result).toBe(expectedIndex);
      }
    );
  });
});
