/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IExampleExternalService } from './types';

/**
 * It's just a dummy example of calling an external service.
 */
export class ExampleExternalService implements IExampleExternalService {
  private readonly proxies: Record<string, string> = {};

  constructor(proxies: Record<string, string>) {
    this.proxies = proxies;
  }

  public async getProxies(): Promise<{ id: string; url: string }[]> {
    // An artificial delay is added to simulate a real-world external service call.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return Object.entries(this.proxies).map(([id, url]) => ({ id, url }));
  }

  public async getProxy(proxyId: string): Promise<{ id: string; url: string } | null> {
    // An artificial delay is added to simulate a real-world external service call.
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!this.proxies[proxyId]) {
      return null;
    }
    return { id: proxyId, url: this.proxies[proxyId] };
  }
}
