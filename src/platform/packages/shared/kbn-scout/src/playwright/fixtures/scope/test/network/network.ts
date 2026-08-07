/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@playwright/test';
import type { ScoutPage } from '../scout_page';

interface MatchOptions {
  endpoint: string;
  method?: string;
  exactPathname?: boolean;
}

export class Network {
  constructor(private readonly page: ScoutPage) {}

  private matchesEndpoint(request: Request, options: MatchOptions) {
    if (options.method && request.method() !== options.method) {
      return false;
    }

    if (!options.exactPathname) {
      return request.url().includes(options.endpoint);
    }

    try {
      return new URL(request.url()).pathname.endsWith(options.endpoint);
    } catch {
      return false;
    }
  }

  async trackMatchingRequests(
    options: MatchOptions,
    action: (getCount: () => number) => Promise<void>
  ): Promise<number> {
    let count = 0;
    const listener = (request: Request) => {
      if (this.matchesEndpoint(request, options)) {
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
    matchOptions: MatchOptions,
    action: () => Promise<void>
  ): Promise<number> {
    return this.trackMatchingRequests(matchOptions, async () => {
      await action();
    });
  }
}
