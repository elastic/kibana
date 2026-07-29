/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const staticLookupFormatSchema = z
  .object({
    type: z.literal('static_lookup'),
    params: z.object({
      lookup_entries: z.array(z.object({ key: z.string(), value: z.string() })).meta({
        id: 'kbn-field-format-static_lookup-lookup_entries',
        title: 'Lookup entries',
        description:
          'The lookup entries to use for the static lookup. The key refers to the field value, and the value refers to the new value to display.',
      }),
      unknown_key_value: z.string().optional().meta({
        id: 'kbn-field-format-static_lookup-unknown_key_value',
        title: 'Unknown key value',
        description:
          'The value to display for unknown key values. If not provided, the field value will be displayed.',
      }),
    }),
  })
  .meta({
    id: 'kbn-field-format-static_lookup',
    title: 'Static lookup field format',
    description:
      'Formats a field into a static value based on the lookup entries or the unknown key value.',
  });
