/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '../scout_page';

interface CountMatchingRequestsOptions {
  method?: string;
  exactPathname?: boolean;
}

interface NetworkRequest {
  url: () => string;
  method: () => string;
}

export class Network {
  constructor(private readonly page: ScoutPage) {}

  private matchesEndpoint(
    request: NetworkRequest,
    endpoint: string,
    options: CountMatchingRequestsOptions
  ) {
    if (options.method && request.method() !== options.method) {
      return false;
    }

    if (!options.exactPathname) {
      return request.url().includes(endpoint);
    }

    try {
      return new URL(request.url()).pathname.endsWith(endpoint);
    } catch {
      return false;
    }
  }

  async trackMatchingRequests(
    endpoint: string,

    action: (getCount: () => number) => Promise<void>,
    options: CountMatchingRequestsOptions = {}
  ): Promise<number> {
    let count = 0;
    const listener = (request: NetworkRequest) => {
      if (this.matchesEndpoint(request, endpoint, options)) {
        count++;
      }
    };

    this.page.on('request', listener);
    try {
      await action(() => count);
      return count;
    } finally {
      this.page.off('request', listener);
    }
  }

  async countMatchingRequests(
    endpoint: string,
    action: () => Promise<void>,
    options: CountMatchingRequestsOptions = {}
  ): Promise<number> {
    return this.trackMatchingRequests(
      endpoint,
      async () => {
        await action();
      },
      options
    );
  }
}
