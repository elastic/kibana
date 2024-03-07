/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

export interface AssistClientOptionsWithCreds {
  cloud_id: string;
  api_key: string;
}
export interface AssistClientOptionsWithClient {
  es_client: ElasticsearchClient;
}

export type AssistOptions = AssistClientOptionsWithCreds | AssistClientOptionsWithClient;

export class AssistClient {
  private options: AssistOptions;
  protected client: ElasticsearchClient;

  constructor(options: AssistOptions) {
    this.options = options as AssistClientOptionsWithCreds;
    if ('es_client' in options) {
      this.client = (options as AssistClientOptionsWithClient).es_client;
    } else {
      this.client = new ElasticsearchClient({
        cloud: {
          id: this.options.cloud_id,
        },
        auth: {
          apiKey: this.options.api_key,
        },
      });
    }
  }

  getClient() {
    return this.client;
  }
}

export function createAssist(options: AssistOptions) {
  return new AssistClient(options);
}
