/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterFn } from 'elastic-apm-node';
import { isPlainObject, has } from 'lodash';

export const piiFilter: FilterFn = (payload) => {
  try {
    // if user context is defined, apply the pii filter
    if (has(payload.context, 'user')) {
      // if the user context has loopable properties, redact the values
      if (payload.context.user != null && isPlainObject(payload.context.user)) {
        const userContextKeys = Object.keys(payload.context.user);
        for (const key of userContextKeys) {
          payload.context.user[key] = '[REDACTED]';
        }
      } else {
        // Replace with a known invalid object to avoid APM trace discards
        payload.context.user = { id: '[INVALID]' };
      }
    }
  } catch (error) {
    // If there's an error for any reason in the context access, override the whole user context.
    Object.assign(payload.context, { user: { id: '[INVALID]' } });
  }

  return payload;
};
