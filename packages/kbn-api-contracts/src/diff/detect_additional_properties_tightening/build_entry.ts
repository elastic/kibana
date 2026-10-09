/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasdiffEntry } from '../parse_oasdiff';

export const REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID =
  'kbn:request-additional-properties-tightened';

export const TIGHTENING_TEXT =
  'Request body schema disallows extra fields (additionalProperties: false). Clients sending unknown keys will now receive 400.';

export const buildEntry = (input: {
  path: string;
  method: string;
  source: string;
}): OasdiffEntry => ({
  id: REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
  level: 3,
  text: TIGHTENING_TEXT,
  operation: input.method,
  path: input.path,
  source: input.source,
});
