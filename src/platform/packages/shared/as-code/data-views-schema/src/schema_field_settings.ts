/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const fieldSettingsBaseSchema = z
  .object({
    format: z
      .object({
        type: z.string(),
        params: z.any().optional(),
      })
      .meta({
        id: 'kbn-field-format',
        title: 'Format',
        description:
          'Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.',
      })
      .optional(),
    custom_label: z
      .string()
      .min(1)
      .meta({
        id: 'kbn-field-custom-label',
        title: 'Custom label',
        description:
          'Create a label to display in place of the field name in Discover, Maps, Lens, Visualize, and TSVB. Useful for shortening a long field name. Queries and filters use the original field name.',
      })
      .optional(),
    custom_description: z
      .string()
      .min(1)
      .meta({
        id: 'kbn-field-custom-description',
        title: 'Custom description',
        description:
          "Add a description to the field. It's displayed next to the field on the Discover, Lens, and Data View Management pages.",
      })
      .optional(),
  })
  .meta({
    id: 'kbn-data-view-field-setting',
    title: 'Field settings',
    description:
      'Display overrides for a field. These settings can define a custom label, description, and format.',
  });

const popularitySchema = z
  .number()
  .min(0)
  .meta({
    id: 'kbn-runtime-field-popularity',
    title: 'Popularity',
    description:
      'Adjust the popularity to make the field appear higher or lower in the fields list. By default, Discover orders fields from most selected to least selected.',
  })
  .optional();

export const fieldSettingsWithPopularitySchema = fieldSettingsBaseSchema
  .extend({
    popularity: popularitySchema,
  })
  .meta({
    id: 'kbn-field-settings-with-popularity',
    title: 'Field settings',
    description:
      'Display overrides for a field. These settings can define a custom label, description, format and popularity.',
  });
