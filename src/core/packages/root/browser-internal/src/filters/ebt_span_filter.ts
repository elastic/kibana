/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ignorePaths = ['/kibana-browser'];

// Copied from @elastic/apm-rum/src/common/types.ts
export type FilterFn = (payload: Payload) => Payload | boolean | void;
export interface Payload {
  [key: string]: any;
}

const hasTrackedSpan = (spans: any): boolean => {
  // Check if there is any span with a URL other than ignorePaths
  return !spans.every((span: any) => {
    const url = span?.context?.http?.url;
    return typeof url === 'string' ? ignorePaths.some((p) => url.includes(p)) : false;
  });
};

// Related to https://github.com/elastic/observability-dev/issues/4529
// This filter is only applied to transactions of type 'user-interaction'.
// If a 'user-interaction' transaction contains only EBT spans, it will be filtered out.
export const ebtSpanFilter: FilterFn = (payload: Payload) => {
  try {
    if (payload.transactions) {
      payload.transactions = payload.transactions.filter((tr: any) => {
        if (tr.type === 'user-interaction') {
          return hasTrackedSpan(tr.spans);
        }
        // Keep all non-user-interaction transactions
        return true;
      });
    }
  } catch (error) {
    // No need to handle errors here, we will keep the span if there is an error
  }

  return payload;
};
