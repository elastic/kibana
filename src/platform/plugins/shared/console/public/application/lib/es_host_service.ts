/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Api } from './api';

/**
 * Very simple state for holding the current ES host.
 *
 * This is used to power the copy as cURL functionality.
 */
export class EsHostService {
  private host = 'http://localhost:9200';

  constructor(private readonly api: Api) {}

  private setHost(host: string): void {
    this.host = host;
  }

  /**
   * Initialize the host value based on the value set on the server.
   *
   * This call is necessary because this value can only be retrieved at
   * runtime.
   */
  public async init() {
    const { data } = await this.api.getEsConfig();
    if (data && data.host) {
      this.setHost(data.host);
    }
  }

  public getHost(): string {
    return this.host;
  }
}

export const createEsHostService = ({ api }: { api: Api }) => new EsHostService(api);
