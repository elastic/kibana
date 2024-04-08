/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fieldConstants } from '..';
import { DocumentOverview } from '../types';

export const getMessageFieldWithFallbacks = (doc: DocumentOverview) => {
  const rankingOrder = [
    fieldConstants.MESSAGE_FIELD,
    fieldConstants.ERROR_MESSAGE_FIELD,
    fieldConstants.EVENT_ORIGINAL_FIELD,
  ] as const;

  for (const rank of rankingOrder) {
    if (doc[rank] !== undefined && doc[rank] !== null) {
      return { field: rank, value: doc[rank] };
    }
  }

  // If none of the ranks (fallbacks) are present
  return { field: undefined };
};
