/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClientRequester, uriencode } from './kbn_client_requester';

interface UpdateBody {
  name: string;
  description?: string;
  disabledFeatures?: string | string[];
  initials?: string;
  color?: string;
  imageUrl?: string;
}

interface CreateBody extends UpdateBody {
  id: string;
}

export class KbnClientSpaces {
  constructor(private readonly requester: KbnClientRequester) {}

  async create(body: CreateBody) {
    await this.requester.request({
      method: 'POST',
      path: '/api/spaces/space',
      body,
    });
  }

  async update(id: string, body: UpdateBody) {
    await this.requester.request({
      method: 'PUT',
      path: uriencode`/api/spaces/space/${id}`,
      body,
    });
  }

  async get(id: string) {
    const { data } = await this.requester.request({
      method: 'GET',
      path: uriencode`/api/spaces/space/${id}`,
    });

    return data;
  }

  async list() {
    const { data } = await this.requester.request({
      method: 'GET',
      path: '/api/spaces/space',
    });

    return data;
  }

  async delete(id: string) {
    await this.requester.request({
      method: 'DELETE',
      path: uriencode`/api/spaces/space/${id}`,
    });
  }
}
