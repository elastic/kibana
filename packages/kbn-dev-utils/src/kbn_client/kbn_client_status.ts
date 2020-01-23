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

import { KbnClientRequester } from './kbn_client_requester';

interface Status {
  state: 'green' | 'red' | 'yellow';
  title?: string;
  id?: string;
  icon: string;
  message: string;
  uiColor: string;
  since: string;
}

interface ApiResponseStatus {
  name: string;
  uuid: string;
  running_from_source?: true;
  version: {
    number: string;
    build_hash: string;
    build_number: number;
    build_snapshot: boolean;
  };
  status: {
    overall: Status;
    statuses: Status[];
  };
  metrics: unknown;
}

export class KbnClientStatus {
  constructor(private readonly requester: KbnClientRequester) {}

  /**
   * Get the full server status
   */
  async get() {
    return await this.requester.request<ApiResponseStatus>({
      method: 'GET',
      path: 'api/status',
    });
  }

  public async isDistributable() {
    const status = await this.get();
    return !status.running_from_source;
  }

  /**
   * Get the overall/merged state
   */
  public async getOverallState() {
    const status = await this.get();
    return status.status.overall.state;
  }
}
