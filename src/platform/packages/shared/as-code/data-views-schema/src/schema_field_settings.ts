/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const indexedFieldFormatSchema = schema.object({
  type: schema.string(),
  params: schema.maybe(schema.any()),
});

export const customLabelSchema = schema.maybe(
  schema.string({
    minLength: 1,
    meta: {
      id: 'kbn-runtime-field-custom-label',
      title: 'Custom label',
      description:
        'Create a label to display in place of the field name in Discover, Maps, Lens, Visualize, and TSVB. Useful for shortening a long field name. Queries and filters use the original field name.',
    },
  })
);

export const customDescriptionSchema = schema.maybe(
  schema.string({
    minLength: 1,
    meta: {
      id: 'kbn-runtime-field-custom-description',
      title: 'Custom description',
      description:
        "Add a description to the field. It's displayed next to the field on the Discover, Lens, and Data View Management pages.",
    },
  })
);

export const fieldSettingsSchema = schema.object(
  {
    format: schema.maybe(indexedFieldFormatSchema),
    custom_label: customLabelSchema,
    custom_description: customDescriptionSchema,
  },
  {
    meta: {
      id: 'kbn-data-view-field-setting',
      title: 'Field settings',
      description:
        'Display overrides for a field. These settings can define a custom label, description, and format.',
    },
    validate(value) {
      if (!value.format && !value.custom_label && !value.custom_description) {
        return 'At least one of `format`, `custom_label`, or `custom_description` must be defined.';
      }
    },
  }
);
