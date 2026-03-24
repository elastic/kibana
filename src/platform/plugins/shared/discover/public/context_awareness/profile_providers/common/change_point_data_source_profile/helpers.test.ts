/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import {
  buildChangePointLensAttributesByRecordId,
  mapForkIndexToEntityChartKey,
  rowIsQualifyingChangePointForDocChart,
} from './helpers';

const mockLensAttrs = {
  title: 't',
  visualizationType: 'lnsXY',
} as unknown as TypedLensByValueInput['attributes'];

describe('change_point helpers (doc tab bridge)', () => {
  describe('mapForkIndexToEntityChartKey', () => {
    it('returns fork index when in range', () => {
      expect(
        mapForkIndexToEntityChartKey(1, [
          { branchLabel: 'a', branchIndex: 0 },
          { branchLabel: 'b', branchIndex: 1 },
        ])
      ).toBe(1);
    });

    it('maps branchIndex to array index when fork value uses branchIndex', () => {
      expect(
        mapForkIndexToEntityChartKey(5, [
          { branchLabel: 'a', branchIndex: 0 },
          { branchLabel: 'b', branchIndex: 5 },
        ])
      ).toBe(1);
    });
  });

  describe('rowIsQualifyingChangePointForDocChart', () => {
    const table = {
      type: 'datatable' as const,
      columns: [
        { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
        { id: 'type', name: 'type', meta: { type: 'string' } },
        { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
      ],
      rows: [
        { '@timestamp': '2024-01-01T00:00:00.000Z', type: 'change_point', pvalue: 0.01 },
        { '@timestamp': '2024-01-02T00:00:00.000Z', type: null, pvalue: 0.02 },
        { '@timestamp': '2024-01-03T00:00:00.000Z', type: 'change_point', pvalue: null },
      ],
    };

    it('returns true only when time, type, and p-value are all present', () => {
      expect(
        rowIsQualifyingChangePointForDocChart(
          table.rows[0] as Record<string, unknown>,
          table,
          '@timestamp',
          'type',
          'pvalue'
        )
      ).toBe(true);
      expect(
        rowIsQualifyingChangePointForDocChart(
          table.rows[1] as Record<string, unknown>,
          table,
          '@timestamp',
          'type',
          'pvalue'
        )
      ).toBe(false);
      expect(
        rowIsQualifyingChangePointForDocChart(
          table.rows[2] as Record<string, unknown>,
          table,
          '@timestamp',
          'type',
          'pvalue'
        )
      ).toBe(false);
    });
  });

  describe('buildChangePointLensAttributesByRecordId', () => {
    it('maps only qualifying change-point rows in single-entity mode', () => {
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
          { id: 'type', name: 'type', meta: { type: 'string' } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
        ],
        rows: [
          { '@timestamp': '2024-01-01T00:00:00.000Z', type: 'change_point', pvalue: 0.01 },
          { '@timestamp': '2024-01-02T00:00:00.000Z', type: null, pvalue: 0.02 },
        ],
      };
      const out = buildChangePointLensAttributesByRecordId(
        table,
        table.columns,
        { typeColumnId: 'type', pvalueColumnId: 'pvalue' },
        undefined,
        {},
        mockLensAttrs,
        false
      );
      expect(out['0']).toBe(mockLensAttrs);
      expect(out['1']).toBeUndefined();
    });
  });
});
