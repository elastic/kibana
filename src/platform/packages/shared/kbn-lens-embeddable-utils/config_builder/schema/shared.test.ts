/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { expectPrettyError } from '@kbn/zod-helpers/v4';

import type { LayerSettingsSchema } from './shared';
import { sharedPanelInfoSchema, layerSettingsSchema, collapseBySchema } from './shared';

type SharedPanelInfoInput = z.input<typeof sharedPanelInfoSchema>;
type LayerSettingsInput = z.input<typeof layerSettingsSchema>;

describe('Shared Schemas', () => {
  describe('sharedPanelInfoSchema', () => {
    it('validates panel info with title and description', () => {
      const input = {
        title: 'My Chart',
        description: 'This is a sample chart',
      } satisfies SharedPanelInfoInput;

      const validated = sharedPanelInfoSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates panel info with only title', () => {
      const input = {
        title: 'My Chart',
      } satisfies SharedPanelInfoInput;

      const validated = sharedPanelInfoSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates panel info with only description', () => {
      const input = {
        description: 'This is a sample chart',
      } satisfies SharedPanelInfoInput;

      const validated = sharedPanelInfoSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates empty panel info', () => {
      const input = {} satisfies SharedPanelInfoInput;

      const validated = sharedPanelInfoSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });

  describe('layerSettingsSchema', () => {
    it('validates layer settings with all fields', () => {
      const input = {
        sampling: 0.5,
        ignore_global_filters: true,
      } satisfies LayerSettingsInput;

      const validated = layerSettingsSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates layer settings with default values', () => {
      const input = {} satisfies LayerSettingsInput;

      const validated = layerSettingsSchema.parse(input);
      expect(validated).toEqual({
        sampling: 1,
        ignore_global_filters: false,
      } satisfies LayerSettingsSchema);
    });

    it('throws on invalid sampling value below minimum', () => {
      const input = {
        sampling: -0.1,
      } satisfies LayerSettingsInput;

      const result = layerSettingsSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too small: expected number to be >=0
          → at sampling"
      `);
    });

    it('throws on invalid sampling value above maximum', () => {
      const input = {
        sampling: 1.1,
      } satisfies LayerSettingsInput;

      const result = layerSettingsSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too big: expected number to be <=1
          → at sampling"
      `);
    });

    it('validates sampling edge cases', () => {
      const inputs = [
        { sampling: 0 },
        { sampling: 1 },
        { sampling: 0.5 },
      ] satisfies LayerSettingsInput[];

      inputs.forEach((input) => {
        const validated = layerSettingsSchema.parse(input);
        expect(validated).toEqual({
          ignore_global_filters: false,
          ...input,
        } satisfies LayerSettingsSchema);
      });
    });
  });

  describe('collapseBySchema', () => {
    it('validates all allowed collapse by values', () => {
      const validValues = ['avg', 'sum', 'max', 'min'] as const;

      validValues.forEach((value) => {
        const validated = collapseBySchema.parse(value);
        expect(validated).toEqual(value);
      });
    });

    it('throws on invalid collapse by value', () => {
      const input = 'invalid';

      const result = collapseBySchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });
  });

  describe('complex scenarios', () => {
    it('validates combination of all schemas', () => {
      const input = {
        panelInfo: {
          title: 'Complex Chart',
          description: 'A chart with all settings',
        } satisfies SharedPanelInfoInput,
        layerSettings: {
          sampling: 0.75,
          ignore_global_filters: true,
        } satisfies LayerSettingsInput,
        collapseBy: 'avg' as const,
      };

      const validated = {
        panelInfo: sharedPanelInfoSchema.parse(input.panelInfo),
        layerSettings: layerSettingsSchema.parse(input.layerSettings),
        collapseBy: collapseBySchema.parse(input.collapseBy),
      };

      expect(validated).toEqual({
        panelInfo: input.panelInfo,
        layerSettings: input.layerSettings,
        collapseBy: input.collapseBy,
      });
    });

    it('validates minimum required configuration', () => {
      const input = {
        panelInfo: {},
        layerSettings: {},
      };

      const validated = {
        panelInfo: sharedPanelInfoSchema.parse(input.panelInfo),
        layerSettings: layerSettingsSchema.parse(input.layerSettings),
      };

      expect(validated).toEqual({
        panelInfo: {},
        layerSettings: {
          sampling: 1,
          ignore_global_filters: false,
        },
      });
    });
  });
});
