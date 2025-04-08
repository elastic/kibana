/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const badResponseSchema = () => ({
  description: 'Bad request.',
  bodyContentType: 'application/json',
  body: () =>
    schema.object(
      {
        error: schema.string(),
        message: schema.string(),
        statusCode: schema.literal(400),
      },
      {
        meta: {
          description: 'Indicates an unsuccessful response.',
        },
      }
    ),
});
