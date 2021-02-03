/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    const { data } = await this.requester.request<ApiResponseStatus>({
      method: 'GET',
      path: 'api/status',
    });
    return data;
  }

  /**
   * Get the overall/merged state
   */
  public async getOverallState() {
    const status = await this.get();
    return status.status.overall.state;
  }
}
