/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEsError } from '@kbn/search-errors';

/**
 * Elasticsearch's reason for a failed search. A failed async search can carry only its
 * id as the message; the reason sits in the error attributes.
 */
export function getSearchErrorReason(error: unknown): string {
  if (typeof error === 'object' && error !== null && isEsError(error)) {
    const cause = error.attributes?.error;
    const reason = cause?.caused_by?.reason ?? cause?.root_cause?.[0]?.reason ?? cause?.reason;
    if (reason) return reason;
  }
  return error instanceof Error ? error.message : String(error);
}
