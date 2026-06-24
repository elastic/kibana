/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type WorkflowExternalCredPurpose,
  WORKFLOWS_EXTERNAL_CREDS_INDEX,
} from './external_creds_constants';

interface WorkflowExternalCredDocument {
  purpose: WorkflowExternalCredPurpose;
  secret: string;
  expiresAt: string;
}

export interface WorkflowExternalCredsStoreContract {
  put(params: {
    id: string;
    purpose: WorkflowExternalCredPurpose;
    secret: string;
    expiresAt: string;
  }): Promise<void>;
  get(params: {
    id: string;
    expectedPurpose: WorkflowExternalCredPurpose;
  }): Promise<string | undefined>;
  delete(id: string): Promise<void>;
}

export class WorkflowExternalCredsStore implements WorkflowExternalCredsStoreContract {
  constructor(private readonly esClient: ElasticsearchClient) {}

  async put({
    id,
    purpose,
    secret,
    expiresAt,
  }: {
    id: string;
    purpose: WorkflowExternalCredPurpose;
    secret: string;
    expiresAt: string;
  }): Promise<void> {
    await this.esClient.index({
      index: WORKFLOWS_EXTERNAL_CREDS_INDEX,
      id,
      document: {
        purpose,
        secret,
        expiresAt,
      } satisfies WorkflowExternalCredDocument,
    });
  }

  async get({
    id,
    expectedPurpose,
  }: {
    id: string;
    expectedPurpose: WorkflowExternalCredPurpose;
  }): Promise<string | undefined> {
    try {
      const result = await this.esClient.get<WorkflowExternalCredDocument>({
        index: WORKFLOWS_EXTERNAL_CREDS_INDEX,
        id,
      });

      const source = result._source;
      if (!source) {
        return undefined;
      }

      if (source.purpose !== expectedPurpose) {
        return undefined;
      }

      if (new Date(source.expiresAt).getTime() <= Date.now()) {
        return undefined;
      }

      return source.secret;
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: WORKFLOWS_EXTERNAL_CREDS_INDEX,
        id,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'meta' in error &&
    (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
  );
}
