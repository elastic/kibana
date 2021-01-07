/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
