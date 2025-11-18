/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Api } from './api';

/**
 * Service for managing ES host information.
 *
 * This holds the current ES host (used for copy as cURL functionality)
 * and the list of all available hosts (used for host selection dropdown).
 */
export class EsHostService {
  private host = 'http://localhost:9200';
  private allHosts: string[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly api: Api) {}

  private setHost(host: string): void {
    this.host = host;
  }

  private setAllHosts(hosts: string[]): void {
    this.allHosts = hosts;
  }

  /**
   * Initialize the host values based on the values set on the server.
   *
   * This call is necessary because these values can only be retrieved at
   * runtime.
   */
  public async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit() {
    try {
      const { data } = await this.api.getEsConfig();
      if (data) {
        if (data.host) {
          this.setHost(data.host);
        }
        if (data.allHosts) {
          this.setAllHosts(data.allHosts);
        }
      }
      this.initialized = true;
    } catch (error) {
      return Promise.resolve();
    }
  }

  public getHost(): string {
    return this.host;
  }

  public getAllHosts(): string[] {
    return this.allHosts;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Wait for the service to be initialized before using it
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      await this.initPromise;
    }
  }
}

export const createEsHostService = ({ api }: { api: Api }) => new EsHostService(api);
