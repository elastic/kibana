/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { WorkflowYaml } from '@kbn/workflows';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { getTriggerTypesFromDefinition } from '../api/lib/workflow_prepare';
import type { WorkflowProperties, WorkflowStorage } from '../storage/workflow_storage';

const SEEDING_SPACE_ID = 'default';
const SEEDING_CREATED_BY = 'system';

type StorageClient = ReturnType<WorkflowStorage['getClient']>;
type ExistingDoc = Awaited<ReturnType<StorageClient['get']>>;

const seedSingleWorkflow = async ({
  id,
  yaml,
  client,
  logger,
}: {
  id: string;
  yaml: string;
  client: StorageClient;
  logger: Logger;
}): Promise<void> => {
  let existing: ExistingDoc | null = null;
  try {
    existing = await client.get({ id });
  } catch (err) {
    if (!isResponseError(err) || err.statusCode !== 404) {
      logger.warn(
        `[seedDefaultWorkflows] Failed to check existence of workflow "${id}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return;
    }
  }

  if (existing) {
    // Respect admin deletions — don't resurrect a soft-deleted workflow.
    if (existing._source?.deleted_at) {
      logger.debug(`[seedDefaultWorkflows] Workflow "${id}" was deleted by an admin — skipping`);
      return;
    }

    const existingYaml = existing._source?.yaml;
    if (existingYaml === yaml) {
      logger.debug(
        `[seedDefaultWorkflows] Workflow "${id}" already exists and is up to date — skipping`
      );
      return;
    }

    // YAML changed (e.g. bug fix) — replace stored yaml/definition/triggerTypes while
    // preserving enabled, tags, and any other admin-controlled fields.
    const parsed = parseYamlToJSONWithoutValidation(yaml);
    if (!parsed.success || !parsed.json || typeof parsed.json !== 'object') {
      logger.warn(`[seedDefaultWorkflows] Failed to parse updated YAML for workflow "${id}"`);
      return;
    }
    const definition = parsed.json as WorkflowYaml;
    const triggerTypes = getTriggerTypesFromDefinition(definition);
    try {
      await client.index({
        id,
        document: {
          ...(existing._source as WorkflowProperties),
          yaml,
          definition,
          triggerTypes,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        },
        refresh: 'wait_for',
      });
      logger.info(`[seedDefaultWorkflows] Updated workflow "${id}" with new YAML`);
    } catch (updateErr) {
      logger.warn(
        `[seedDefaultWorkflows] Failed to update workflow "${id}": ${
          updateErr instanceof Error ? updateErr.message : String(updateErr)
        }`
      );
    }
    return;
  }

  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success || !parsed.json || typeof parsed.json !== 'object') {
    logger.warn(`[seedDefaultWorkflows] Failed to parse YAML for workflow "${id}"`);
    return;
  }

  const parsedObj = parsed.json as Record<string, unknown>;
  const name = typeof parsedObj.name === 'string' ? parsedObj.name : id;
  const definition = parsed.json as WorkflowYaml;
  const triggerTypes = getTriggerTypesFromDefinition(definition);
  const now = new Date().toISOString();

  try {
    await client.index({
      id,
      document: {
        name,
        description: undefined,
        enabled: false,
        tags: [],
        triggerTypes,
        yaml,
        definition,
        createdBy: SEEDING_CREATED_BY,
        lastUpdatedBy: SEEDING_CREATED_BY,
        spaceId: SEEDING_SPACE_ID,
        valid: true,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      },
      refresh: 'wait_for',
    });
    logger.info(`[seedDefaultWorkflows] Seeded workflow "${id}"`);
  } catch (indexErr) {
    logger.warn(
      `[seedDefaultWorkflows] Failed to seed workflow "${id}": ${
        indexErr instanceof Error ? indexErr.message : String(indexErr)
      }`
    );
  }
};

export const seedDefaultWorkflows = async (
  storage: WorkflowStorage,
  defaultWorkflows: Array<{ id: string; yaml: string }>,
  logger: Logger
): Promise<void> => {
  const client = storage.getClient();

  for (const { id, yaml } of defaultWorkflows) {
    await seedSingleWorkflow({ id, yaml, client, logger });
  }
};
