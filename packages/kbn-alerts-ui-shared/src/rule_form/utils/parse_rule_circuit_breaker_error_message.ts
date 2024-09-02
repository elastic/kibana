/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errorMessageHeader } from '@kbn/alerting-types';

export const parseRuleCircuitBreakerErrorMessage = (
  message: string
): {
  summary: string;
  details?: string;
} => {
  if (!message.includes(errorMessageHeader)) {
    return {
      summary: message,
    };
  }
  const segments = message.split(' - ');
  return {
    summary: segments[1],
    details: segments[2],
  };
};
