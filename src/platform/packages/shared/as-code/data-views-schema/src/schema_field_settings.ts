/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const fieldSettingsBaseSchema = schema.object(
  {
    format: schema.maybe(
      schema.object(
        {
          type: schema.string(),
          params: schema.maybe(schema.any()),
        },
        {
          meta: {
            id: 'kbn-field-format',
            title: 'Format',
            description:
              'Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.',
          },
        }
      )
    ),
    custom_label: schema.maybe(
      schema.string({
        minLength: 1,
        meta: {
          id: 'kbn-field-custom-label',
          title: 'Custom label',
          description:
            'Create a label to display in place of the field name in Discover, Maps, Lens, Visualize, and TSVB. Useful for shortening a long field name. Queries and filters use the original field name.',
        },
      })
    ),
    custom_description: schema.maybe(
      schema.string({
        minLength: 1,
        meta: {
          id: 'kbn-field-custom-description',
          title: 'Custom description',
          description:
            "Add a description to the field. It's displayed next to the field on the Discover, Lens, and Data View Management pages.",
        },
      })
    ),
  },
  {
    meta: {
      id: 'kbn-data-view-field-setting',
      title: 'Field settings',
      description:
        'Display overrides for a field. These settings can define a custom label, description, and format.',
    },
  }
);
