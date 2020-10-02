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
import http from 'http';
import https from 'https';

export class HttpAgentFactory {
  #httpAgent?: http.Agent;
  #httpsAgent?: https.Agent;

  constructor() {}

  get(protocol: 'http' | 'https'): http.Agent | https.Agent {
    if (protocol === 'http') {
      return this.httpAgent;
    }

    return this.httpsAgent;
  }

  private get httpsAgent(): https.Agent {
    if (this.#httpsAgent == null) {
      this.#httpsAgent = new https.Agent();
    }

    return this.#httpsAgent;
  }

  private get httpAgent(): http.Agent {
    if (this.#httpAgent == null) {
      this.#httpAgent = new http.Agent();
    }

    return this.#httpAgent;
  }
}
