/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorSchema } from './error_schema';

export const getErrorSchemaMock = (
  id: string = '819eded6-e9c8-445b-a647-519aea39e063'
): ErrorSchema => ({
  id,
  error: {
    status_code: 404,
    message: 'id: "819eded6-e9c8-445b-a647-519aea39e063" not found',
  },
});
