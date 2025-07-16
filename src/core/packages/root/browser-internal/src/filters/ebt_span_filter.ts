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

export const ebtSpanFilter: FilterFn = (payload: Payload) => {
  try {
    if (payload.transactions) {
      payload.transactions.forEach((tr: any) => {
        tr.spans = tr.spans.filter((span: any) => {
          if (
            span.context?.http?.url &&
            ignorePaths.some((p) => span.context.http.url.includes(p))
          ) {
            return false;
          }
        });
      });
    }
  } catch (error) {
    // No need to handle errors here, we will keep the span if there is an error
  }

  return payload;
};
