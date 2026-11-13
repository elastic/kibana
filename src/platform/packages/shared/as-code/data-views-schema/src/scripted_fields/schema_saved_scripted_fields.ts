/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { MAX_NAME_LENGTH } from '../runtime_fields/common';
import { fieldSettingsWithPopularitySchema } from '../field_settings/schema_field_settings';

export const savedScriptedFieldSchema = lazySchema(() =>
  fieldSettingsWithPopularitySchema
    .extend({
      type: z.string().min(1).max(MAX_NAME_LENGTH).meta({
        title: 'Type',
        description:
          'The Kibana field type of the scripted field (e.g., "string", "number", "date", "boolean", "ip", "geo_point").',
      }),
      script: z.string().min(1).meta({
        title: 'Script',
        description:
          'The script that computes the value of the scripted field. Scripted fields are deprecated; use runtime fields instead.',
      }),
      lang: z.string().min(1).max(MAX_NAME_LENGTH).optional().meta({
        title: 'Script language',
        description: 'The language of the script. Example: "painless".',
      }),
    })
    .meta({
      id: 'kbn-saved-scripted-field-schema',
      title: 'Saved scripted field',
      description:
        'A deprecated scripted field. Scripted fields are evaluated at query time by Elasticsearch and are read-only in this API.',
    })
);
