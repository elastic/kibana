/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnPalette, getKbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '.';
import {
  hasCustomColors,
  isAssignmentColorCustomized,
  isColorCustomized,
  updateAssignmentsPalette,
  updateColorModePalette,
} from './assignments';

const palettes = getKbnPalettes({ name: 'borealis', darkMode: false });
const rules: ColorMapping.Assignment['rules'] = [{ type: 'match', pattern: 'a' }];

const defaultAssignment = (index: number): ColorMapping.Assignment => ({
  rules,
  color: { type: 'categorical', paletteId: KbnPalette.Default, colorIndex: index },
});

const customAssignment: ColorMapping.Assignment = {
  rules,
  color: { type: 'colorCode', colorCode: '#ff0000' },
};

const categoricalConfig = (
  assignments: ColorMapping.Config['assignments']
): ColorMapping.Config => ({
  assignments,
  specialAssignments: [],
  paletteId: KbnPalette.Default,
  colorMode: { type: 'categorical' },
});

const gradientStep = (colorIndex: number): ColorMapping.ColorStep => ({
  type: 'categorical',
  paletteId: KbnPalette.Default,
  colorIndex,
});

const gradientConfig = (steps: ColorMapping.ColorStep[]): ColorMapping.Config => ({
  assignments: [],
  specialAssignments: [],
  paletteId: KbnPalette.Default,
  colorMode: { type: 'gradient', steps, sort: 'desc' },
});

describe('Color mapping assignments', () => {
  describe('isAssignmentColorCustomized', () => {
    describe('categorical mode', () => {
      const config = categoricalConfig([]);

      it('returns false for a color from the active palette regardless of index', () => {
        expect(isAssignmentColorCustomized(defaultAssignment(2), config, palettes)).toBe(false);
        expect(isAssignmentColorCustomized(defaultAssignment(5), config, palettes)).toBe(false);
      });

      it('returns true for a custom color code', () => {
        expect(isAssignmentColorCustomized(customAssignment, config, palettes)).toBe(true);
      });

      it('returns true for a color from another palette', () => {
        const assignment: ColorMapping.Assignment = {
          rules,
          color: { type: 'categorical', paletteId: KbnPalette.Neutral, colorIndex: 0 },
        };
        expect(isAssignmentColorCustomized(assignment, config, palettes)).toBe(true);
      });

      it('ignores a stale touched flag', () => {
        const assignment: ColorMapping.Assignment = { ...defaultAssignment(0), touched: true };
        expect(isAssignmentColorCustomized(assignment, config, palettes)).toBe(false);
      });
    });

    describe('gradient mode', () => {
      it('returns false since assignment colors come from the gradient steps', () => {
        const config = gradientConfig([gradientStep(0)]);
        const assignment: ColorMapping.Assignment = { rules, color: { type: 'gradient' } };
        expect(isAssignmentColorCustomized(assignment, config, palettes)).toBe(false);
      });
    });
  });

  describe('isColorCustomized', () => {
    it('returns false for a categorical color from the active palette regardless of index', () => {
      expect(isColorCustomized(gradientStep(2), KbnPalette.Default, palettes)).toBe(false);
      // add/remove reshuffle the color index, so a mismatched index is not a customization.
      expect(isColorCustomized(gradientStep(5), KbnPalette.Default, palettes)).toBe(false);
    });

    it('returns true for a custom color code', () => {
      expect(
        isColorCustomized({ type: 'colorCode', colorCode: '#ff0000' }, KbnPalette.Default, palettes)
      ).toBe(true);
    });

    it('returns true for a color from another palette', () => {
      expect(isColorCustomized(gradientStep(0), KbnPalette.Kibana7, palettes)).toBe(true);
    });

    it('resolves palette aliases before comparing', () => {
      expect(isColorCustomized(gradientStep(0), KbnPalette.Amsterdam, palettes)).toBe(false);
    });
  });

  describe('hasCustomColors', () => {
    it('returns false when every categorical assignment uses the palette default', () => {
      const config = categoricalConfig([defaultAssignment(0), defaultAssignment(1)]);
      expect(hasCustomColors(config, palettes)).toBe(false);
    });

    it('returns true when any categorical assignment has a custom color', () => {
      const config = categoricalConfig([defaultAssignment(0), customAssignment]);
      expect(hasCustomColors(config, palettes)).toBe(true);
    });

    it('stays false when a non-sequential index remains after a delete', () => {
      // Deleting a middle assignment leaves gaps in the color index sequence (removeAssignment
      // splices without re-indexing). Those survivors are still auto colors, not customizations.
      const config = categoricalConfig([defaultAssignment(0), defaultAssignment(2)]);
      expect(hasCustomColors(config, palettes)).toBe(false);
    });

    it('stays false for a freshly added assignment after another was recolored', () => {
      // Recolor the first assignment, then add a new one: the new assignment restarts at index 0
      // (no categorical sibling to continue from) but is still an auto color of the active palette.
      const config = categoricalConfig([customAssignment, defaultAssignment(0)]);
      expect(hasCustomColors(config, palettes)).toBe(true); // from the recolored one only
      const autoOnly = categoricalConfig([defaultAssignment(3), defaultAssignment(0)]);
      expect(hasCustomColors(autoOnly, palettes)).toBe(false);
    });

    it('returns false when every gradient step uses the palette default', () => {
      const config = gradientConfig([gradientStep(0), gradientStep(1)]);
      expect(hasCustomColors(config, palettes)).toBe(false);
    });

    it('returns true when any gradient step has a custom color', () => {
      const config = gradientConfig([gradientStep(0), { type: 'colorCode', colorCode: '#ff0000' }]);
      expect(hasCustomColors(config, palettes)).toBe(true);
    });

    it('stays false when a gradient step index is non-sequential after add/remove', () => {
      // Adding or removing a step reshuffles the step indices (add inserts with a trailing index,
      // remove splices without re-indexing). Those steps are still auto colors, not customizations.
      const config = gradientConfig([gradientStep(0), gradientStep(2)]);
      expect(hasCustomColors(config, palettes)).toBe(false);
    });
  });

  describe('updateAssignmentsPalette', () => {
    it('remaps every assignment to the new palette when not preserving changes', () => {
      const config = categoricalConfig([defaultAssignment(0), customAssignment]);
      const result = updateAssignmentsPalette(
        config,
        config.colorMode,
        KbnPalette.Kibana7,
        palettes,
        false
      );
      expect(result).toEqual([
        { rules, color: { type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 0 } },
        { rules, color: { type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 1 } },
      ]);
    });

    it('keeps customized colors and remaps defaults when preserving changes', () => {
      const config = categoricalConfig([defaultAssignment(0), customAssignment]);
      const result = updateAssignmentsPalette(
        config,
        config.colorMode,
        KbnPalette.Kibana7,
        palettes,
        true
      );
      expect(result).toEqual([
        { rules, color: { type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 0 } },
        customAssignment,
      ]);
    });

    it('drops a stale touched flag from older saved objects', () => {
      const config = categoricalConfig([
        { ...defaultAssignment(0), touched: false },
        { ...customAssignment, touched: true },
      ]);
      const result = updateAssignmentsPalette(
        config,
        config.colorMode,
        KbnPalette.Kibana7,
        palettes,
        true
      );
      expect(result.every((assignment) => !('touched' in assignment))).toBe(true);
    });
  });

  describe('updateColorModePalette', () => {
    it('resets gradient steps to the new palette when not preserving changes', () => {
      const config = gradientConfig([{ type: 'colorCode', colorCode: '#ff0000' }]);
      expect(updateColorModePalette(config, KbnPalette.Kibana7, false, palettes)).toEqual({
        type: 'gradient',
        steps: [{ type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 0 }],
        sort: 'desc',
      });
    });

    it('keeps a custom step and remaps non-custom steps to the new palette when preserving', () => {
      // Only genuinely custom steps survive a palette switch: untouched steps follow the new palette
      // instead of staying pinned to the old one (which would keep `hasCustomColors` true forever).
      const config = gradientConfig([gradientStep(0), { type: 'colorCode', colorCode: '#ff0000' }]);
      expect(updateColorModePalette(config, KbnPalette.Kibana7, true, palettes)).toEqual({
        type: 'gradient',
        steps: [
          { type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 0 },
          { type: 'colorCode', colorCode: '#ff0000' },
        ],
        sort: 'desc',
      });
    });
  });
});
