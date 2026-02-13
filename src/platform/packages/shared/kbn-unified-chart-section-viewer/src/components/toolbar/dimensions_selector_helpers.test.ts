/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOptionDisabledState, sortDimensionOptions } from './dimensions_selector_helpers';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import type { Dimension } from '../../types';
import { ES_FIELD_TYPES } from '@kbn/field-types';

describe('dimensions_selector_helpers', () => {
  describe('getOptionDisabledState', () => {
    it('returns false in single-selection mode regardless of other conditions', () => {
      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: false,
          isIntersecting: false,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: true,
          isIntersecting: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns false for selected items in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isIntersecting: false,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isIntersecting: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns true when not intersecting in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: false,
          isAtMaxLimit: false,
        })
      ).toBe(true);
    });

    it('returns true when at max limit in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: true,
          isAtMaxLimit: true,
        })
      ).toBe(true);
    });

    it('returns true when both not intersecting and at max limit', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: false,
          isAtMaxLimit: true,
        })
      ).toBe(true);
    });

    it('returns false when intersecting and not at max limit', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });
  });

  describe('sortDimensionOptions', () => {
    const createOption = (value: string, checked?: 'on', disabled?: boolean): SelectableEntry => ({
      value,
      label: value,
      checked,
      disabled: disabled ?? false,
      key: value,
    });

    const createDimension = (name: string): Dimension => ({
      name,
      type: ES_FIELD_TYPES.KEYWORD,
    });

    it('sorts selected options first, then available, then disabled', () => {
      const options: SelectableEntry[] = [
        createOption('disabled1', undefined, true),
        createOption('available1'),
        createOption('selected1', 'on'),
        createOption('disabled2', undefined, true),
        createOption('available2'),
        createOption('selected2', 'on'),
      ];

      const result = sortDimensionOptions(options, []);

      expect(result[0].value).toBe('selected1');
      expect(result[1].value).toBe('selected2');
      expect(result[2].value).toBe('available1');
      expect(result[3].value).toBe('available2');
      expect(result[4].value).toBe('disabled1');
      expect(result[5].value).toBe('disabled2');
    });

    it('sorts selected options by selection order', () => {
      const options: SelectableEntry[] = [
        createOption('service.name', 'on'),
        createOption('host.name', 'on'),
        createOption('container.id', 'on'),
      ];

      const selectedDimensions: Dimension[] = [
        createDimension('host.name'),
        createDimension('container.id'),
        createDimension('service.name'),
      ];

      const result = sortDimensionOptions(options, selectedDimensions);

      expect(result[0].value).toBe('host.name');
      expect(result[1].value).toBe('container.id');
      expect(result[2].value).toBe('service.name');
    });

    it('sorts available options alphabetically', () => {
      const options: SelectableEntry[] = [
        createOption('zebra'),
        createOption('alpha'),
        createOption('beta'),
      ];

      const result = sortDimensionOptions(options, []);

      expect(result[0].value).toBe('alpha');
      expect(result[1].value).toBe('beta');
      expect(result[2].value).toBe('zebra');
    });

    it('sorts disabled options alphabetically', () => {
      const options: SelectableEntry[] = [
        createOption('zebra', undefined, true),
        createOption('alpha', undefined, true),
        createOption('beta', undefined, true),
      ];

      const result = sortDimensionOptions(options, []);

      expect(result[0].value).toBe('alpha');
      expect(result[1].value).toBe('beta');
      expect(result[2].value).toBe('zebra');
    });

    it('handles case-insensitive alphabetical sorting', () => {
      const options: SelectableEntry[] = [
        createOption('Zebra'),
        createOption('alpha'),
        createOption('Beta'),
      ];

      const result = sortDimensionOptions(options, []);

      expect(result[0].value).toBe('alpha');
      expect(result[1].value).toBe('Beta');
      expect(result[2].value).toBe('Zebra');
    });

    it('handles selected option not in selectedDimensions list', () => {
      const options: SelectableEntry[] = [
        createOption('selected1', 'on'),
        createOption('selected2', 'on'),
      ];

      const selectedDimensions: Dimension[] = [createDimension('selected1')];

      const result = sortDimensionOptions(options, selectedDimensions);

      expect(result[0].value).toBe('selected1');
      expect(result[1].value).toBe('selected2');
    });

    it('handles empty options array', () => {
      const result = sortDimensionOptions([], []);

      expect(result).toEqual([]);
    });

    it('handles empty selectedDimensions array', () => {
      const options: SelectableEntry[] = [createOption('option1', 'on'), createOption('option2')];

      const result = sortDimensionOptions(options, []);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('option1');
      expect(result[1].value).toBe('option2');
    });

    it('maintains stable sort for options with same priority', () => {
      const options: SelectableEntry[] = [createOption('b'), createOption('a'), createOption('c')];

      const result1 = sortDimensionOptions(options, []);
      const result2 = sortDimensionOptions(options, []);

      expect(result1).toEqual(result2);
      expect(result1[0].value).toBe('a');
      expect(result1[1].value).toBe('b');
      expect(result1[2].value).toBe('c');
    });

    it('handles complex scenario with all option types', () => {
      const options: SelectableEntry[] = [
        createOption('zebra', undefined, true),
        createOption('host.name', 'on'),
        createOption('alpha'),
        createOption('service.name', 'on'),
        createOption('beta'),
        createOption('container.id', 'on'),
        createOption('gamma', undefined, true),
      ];

      const selectedDimensions: Dimension[] = [
        createDimension('service.name'),
        createDimension('container.id'),
        createDimension('host.name'),
      ];

      const result = sortDimensionOptions(options, selectedDimensions);

      // Selected first (in selection order)
      expect(result[0].value).toBe('service.name');
      expect(result[1].value).toBe('container.id');
      expect(result[2].value).toBe('host.name');

      // Available next (alphabetically)
      expect(result[3].value).toBe('alpha');
      expect(result[4].value).toBe('beta');

      // Disabled last (alphabetically)
      expect(result[5].value).toBe('gamma');
      expect(result[6].value).toBe('zebra');
    });
  });
});
