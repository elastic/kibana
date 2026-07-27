/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '../scout_page';

export interface RequestMatcher {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export class Network {
  constructor(private readonly page: ScoutPage) {}

  async countMatchingRequests(
    matchOptions: RequestMatcher,
    action: () => Promise<void>
  ): Promise<number> {
    let count = 0;
    const listener = (request: { url: () => string; method: () => string }) => {
      if (
        request.url().includes(matchOptions.endpoint) &&
        (!matchOptions.method || request.method() === matchOptions.method)
      ) {
        count++;
      }
    };

    this.page.on('request', listener);
    try {
      await action();
    } finally {
      this.page.off('request', listener);
    }

    return count;
  }
}
