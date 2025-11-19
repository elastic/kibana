/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { sharedPanelInfoSchema, layerSettingsSchemaRaw, collapseBySchema } from './shared';

describe('Shared Schemas', () => {
  describe('sharedPanelInfoSchema', () => {
    it('validates panel info with title and description', () => {
      const input = {
        title: 'My Chart',
        description: 'This is a sample chart',
      };

      const validated = schema.object(sharedPanelInfoSchema).validate(input);
      expect(validated).toEqual(input);
    });

    it('validates panel info with only title', () => {
      const input = {
        title: 'My Chart',
      };

      const validated = schema.object(sharedPanelInfoSchema).validate(input);
      expect(validated).toEqual(input);
    });

    it('validates panel info with only description', () => {
      const input = {
        description: 'This is a sample chart',
      };

      const validated = schema.object(sharedPanelInfoSchema).validate(input);
      expect(validated).toEqual(input);
    });

    it('validates empty panel info', () => {
      const input = {};

      const validated = schema.object(sharedPanelInfoSchema).validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('layerSettingsSchema', () => {
    it('validates layer settings with all fields', () => {
      const input = {
        sampling: 0.5,
        ignore_global_filters: true,
      };

      const validated = schema.object(layerSettingsSchemaRaw).validate(input);
      expect(validated).toEqual(input);
    });

    it('validates layer settings with default values', () => {
      const input = {};

      const validated = schema.object(layerSettingsSchemaRaw).validate(input);
      expect(validated).toEqual({
        sampling: 1,
        ignore_global_filters: false,
      });
    });

    it('throws on invalid sampling value below minimum', () => {
      const input = {
        sampling: -0.1,
      };

      expect(() => schema.object(layerSettingsSchemaRaw).validate(input)).toThrow(
        /\[sampling\]: Value must be/
      );
    });

    it('throws on invalid sampling value above maximum', () => {
      const input = {
        sampling: 1.1,
      };

      expect(() => schema.object(layerSettingsSchemaRaw).validate(input)).toThrow(
        /\[sampling\]: Value must be/
      );
    });

    it('validates sampling edge cases', () => {
      const inputs = [{ sampling: 0 }, { sampling: 1 }, { sampling: 0.5 }];

      inputs.forEach((input) => {
        const validated = schema.object(layerSettingsSchemaRaw).validate(input);
        expect(validated).toEqual({ ignore_global_filters: false, ...input });
      });
    });
  });

  describe('collapseBySchema', () => {
    it('validates all allowed collapse by values', () => {
      const validValues = ['avg', 'sum', 'max', 'min'] as const;

      validValues.forEach((value) => {
        const validated = collapseBySchema.validate(value);
        expect(validated).toEqual(value);
      });
    });

    it('throws on invalid collapse by value', () => {
      const input = 'invalid';

      expect(() => collapseBySchema.validate(input)).toThrow(/types that failed validation/);
    });
  });

  describe('complex scenarios', () => {
    it('validates combination of all schemas', () => {
      const input = {
        panelInfo: {
          title: 'Complex Chart',
          description: 'A chart with all settings',
        },
        layerSettings: {
          sampling: 0.75,
          ignore_global_filters: true,
        },
        collapseBy: 'avg' as const,
      };

      const validated = {
        panelInfo: schema.object(sharedPanelInfoSchema).validate(input.panelInfo),
        layerSettings: schema.object(layerSettingsSchemaRaw).validate(input.layerSettings),
        collapseBy: collapseBySchema.validate(input.collapseBy),
      };

      expect(validated).toEqual(input);
    });

    it('validates minimum required configuration', () => {
      const input = {
        panelInfo: {},
        layerSettings: {},
      };

      const validated = {
        panelInfo: schema.object(sharedPanelInfoSchema).validate(input.panelInfo),
        layerSettings: schema.object(layerSettingsSchemaRaw).validate(input.layerSettings),
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
