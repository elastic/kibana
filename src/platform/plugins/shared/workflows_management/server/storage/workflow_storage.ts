/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { WorkflowYaml } from '@kbn/workflows';
import { workflowSystemIndex } from './indices';

export const workflowIndexName = workflowSystemIndex('workflows');

const storageSettings = {
  name: workflowIndexName,
  schema: {
    properties: {
      name: types.text({
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      }),
      description: types.text({
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      }),
      enabled: types.boolean({}),
      tags: types.keyword({}),
      yaml: types.text({ index: false }),
      definition: types.object({ enabled: false }),
      createdBy: types.keyword({}),
      lastUpdatedBy: types.keyword({}),
      spaceId: types.keyword({}),
      deleted_at: types.date({}),
      valid: types.boolean({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface WorkflowProperties {
  name: string;
  description?: string;
  enabled: boolean;
  tags: string[];
  yaml: string;
  definition: WorkflowYaml | null;
  createdBy: string;
  lastUpdatedBy: string;
  spaceId: string;
  deleted_at: Date | null;
  valid: boolean;
  created_at: string;
  updated_at: string;
}

export type WorkflowStorageSettings = typeof storageSettings;

export type WorkflowStorage = StorageIndexAdapter<WorkflowStorageSettings, WorkflowProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): WorkflowStorage => {
  return new StorageIndexAdapter<WorkflowStorageSettings, WorkflowProperties>(
    esClient,
    logger,
    storageSettings
  );
};
