/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const asCodeResolveSchema = schema.object(
  {
    outcome: schema.oneOf([
      schema.literal('exactMatch'),
      schema.literal('aliasMatch'),
      schema.literal('conflict'),
    ]),
    alias_target_id: schema.maybe(schema.string()),
    alias_purpose: schema.maybe(
      schema.oneOf([schema.literal('savedObjectConversion'), schema.literal('savedObjectImport')])
    ),
  },
  {
    meta: {
      id: 'kbn-as-code-resolve',
    },
  }
);
