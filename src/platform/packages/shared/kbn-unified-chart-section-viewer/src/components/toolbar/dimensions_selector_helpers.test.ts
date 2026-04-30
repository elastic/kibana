/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dimension, ParsedMetricItem } from '../../types';
import {
  getApplicableDimensionNames,
  getOptionDisabledState,
  partitionDimensionsForRender,
} from './dimensions_selector_helpers';

const buildMetricItem = (metricName: string, dimensionFields: Dimension[]): ParsedMetricItem => ({
  metricName,
  dataStream: 'metrics-test',
  units: [],
  metricTypes: [],
  fieldTypes: [],
  dimensionFields,
});

describe('dimensions_selector_helpers', () => {
  describe('getOptionDisabledState', () => {
    it('returns false in single-selection mode regardless of other conditions', () => {
      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: false,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns false for selected items in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns true when at max limit in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isAtMaxLimit: true,
        })
      ).toBe(true);
    });
  });

  describe('getApplicableDimensionNames', () => {
    const environment: Dimension = { name: 'environment' };
    const region: Dimension = { name: 'region' };
    const hostName: Dimension = { name: 'host.name' };

    const metricItems: ParsedMetricItem[] = [
      buildMetricItem('cpu.usage', [environment, hostName]),
      buildMetricItem('network.bytes_in', [region, hostName]),
    ];

    it('returns the union of dimensions across metrics that carry every selection', () => {
      const applicable = getApplicableDimensionNames(metricItems, ['host.name']);
      expect(applicable).toEqual(new Set(['environment', 'region', 'host.name']));
    });

    it('narrows to a single metric when only one carries every selected dimension', () => {
      const applicable = getApplicableDimensionNames(metricItems, ['environment']);
      expect(applicable).toEqual(new Set(['environment', 'host.name']));
    });

    it('returns an empty set when no metric carries every selected dimension', () => {
      const applicable = getApplicableDimensionNames(metricItems, ['environment', 'region']);
      expect(applicable).toEqual(new Set());
    });

    it('returns every dimension name when the selection is empty', () => {
      const applicable = getApplicableDimensionNames(metricItems, []);
      expect(applicable).toEqual(new Set(['environment', 'region', 'host.name']));
    });
  });

  describe('partitionDimensionsForRender', () => {
    const a: Dimension = { name: 'a' };
    const b: Dimension = { name: 'b' };
    const c: Dimension = { name: 'c' };

    it('returns dimensions in caller order when no optimistic filter is active', () => {
      const result = partitionDimensionsForRender({
        dimensions: [b, a, c],
        selectedDimensions: [],
        optimisticApplicableNames: null,
      });
      expect(result.orphanSelections).toEqual([]);
      expect(result.applicableDimensions).toEqual([b, a, c]);
    });

    it('narrows applicable dimensions when an optimistic filter is provided', () => {
      const result = partitionDimensionsForRender({
        dimensions: [a, b, c],
        selectedDimensions: [a],
        optimisticApplicableNames: new Set(['a', 'b']),
      });
      expect(result.applicableDimensions).toEqual([a, b]);
      expect(result.orphanSelections).toEqual([]);
    });

    it('surfaces selections that fall outside the applicable set as orphans', () => {
      const orphan: Dimension = { name: 'orphan' };
      const result = partitionDimensionsForRender({
        dimensions: [a, b],
        selectedDimensions: [orphan, a],
        optimisticApplicableNames: new Set(['a', 'b']),
      });
      expect(result.orphanSelections).toEqual([orphan]);
      expect(result.applicableDimensions).toEqual([a, b]);
    });

    it('sorts multiple orphans alphabetically', () => {
      const q: Dimension = { name: 'q' };
      const z: Dimension = { name: 'z' };
      const result = partitionDimensionsForRender({
        dimensions: [],
        selectedDimensions: [z, a, q],
        optimisticApplicableNames: null,
      });
      expect(result.orphanSelections.map((d) => d.name)).toEqual(['a', 'q', 'z']);
    });
  });
});
