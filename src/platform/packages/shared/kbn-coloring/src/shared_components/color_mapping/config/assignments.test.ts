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
  isGradientStepCustomized,
  updateAssignmentsPalette,
  updateColorModePalette,
} from './assignments';

const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });
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

describe('color mapping - assignments', () => {
  describe('isAssignmentColorCustomized', () => {
    describe('categorical mode', () => {
      const config = categoricalConfig([]);

      it('returns false for the palette default color at its index', () => {
        expect(isAssignmentColorCustomized(defaultAssignment(2), 2, config, palettes)).toBe(false);
      });

      it('wraps the default color index by palette size', () => {
        const paletteSize = palettes.get(KbnPalette.Default).colors().length;
        expect(
          isAssignmentColorCustomized(defaultAssignment(0), paletteSize, config, palettes)
        ).toBe(false);
      });

      it('returns true for a custom color code', () => {
        expect(isAssignmentColorCustomized(customAssignment, 0, config, palettes)).toBe(true);
      });

      it('returns true for a color from another palette', () => {
        const assignment: ColorMapping.Assignment = {
          rules,
          color: { type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 0 },
        };
        expect(isAssignmentColorCustomized(assignment, 0, config, palettes)).toBe(true);
      });

      it('returns true for a categorical color at the wrong index', () => {
        expect(isAssignmentColorCustomized(defaultAssignment(5), 0, config, palettes)).toBe(true);
      });

      it('ignores a stale touched flag', () => {
        const assignment: ColorMapping.Assignment = { ...defaultAssignment(0), touched: true };
        expect(isAssignmentColorCustomized(assignment, 0, config, palettes)).toBe(false);
      });
    });

    describe('gradient mode', () => {
      it('returns false since assignment colors come from the gradient steps', () => {
        const config = gradientConfig([gradientStep(0)]);
        const assignment: ColorMapping.Assignment = { rules, color: { type: 'gradient' } };
        expect(isAssignmentColorCustomized(assignment, 0, config, palettes)).toBe(false);
      });
    });
  });

  describe('isGradientStepCustomized', () => {
    it('returns false for the palette default step at its index', () => {
      expect(isGradientStepCustomized(gradientStep(2), 2, KbnPalette.Default)).toBe(false);
    });

    it('returns true for a custom color code step', () => {
      const step: ColorMapping.ColorStep = { type: 'colorCode', colorCode: '#ff0000' };
      expect(isGradientStepCustomized(step, 0, KbnPalette.Default)).toBe(true);
    });

    it('returns true for a step from another palette', () => {
      expect(isGradientStepCustomized(gradientStep(0), 0, KbnPalette.Kibana7)).toBe(true);
    });

    it('returns true for a step at the wrong index', () => {
      expect(isGradientStepCustomized(gradientStep(5), 0, KbnPalette.Default)).toBe(true);
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

    it('returns false when every gradient step uses the palette default', () => {
      const config = gradientConfig([gradientStep(0), gradientStep(1)]);
      expect(hasCustomColors(config, palettes)).toBe(false);
    });

    it('returns true when any gradient step has a custom color', () => {
      const config = gradientConfig([gradientStep(0), { type: 'colorCode', colorCode: '#ff0000' }]);
      expect(hasCustomColors(config, palettes)).toBe(true);
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
    it('resets gradient steps to the new palette without a touched flag', () => {
      const colorMode = gradientConfig([{ type: 'colorCode', colorCode: '#ff0000' }]).colorMode;
      expect(updateColorModePalette(colorMode, KbnPalette.Kibana7, false)).toEqual({
        type: 'gradient',
        steps: [{ type: 'categorical', paletteId: KbnPalette.Kibana7, colorIndex: 0 }],
        sort: 'desc',
      });
    });
  });
});
