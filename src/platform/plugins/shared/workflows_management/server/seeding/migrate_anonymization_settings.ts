/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { WorkflowYaml } from '@kbn/workflows';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import type { WorkflowStorage } from '../storage/workflow_storage';

/**
 * Key for the legacy anonymization UI setting introduced in earlier versions.
 * The setting stores a JSON string with an array of regex/NER rules.
 */
const LEGACY_ANONYMIZATION_UI_SETTING_KEY = 'ai:anonymizationSettings';

/**
 * ID of the default before-prompt workflow seeded by `seedDefaultWorkflows`.
 * This is the workflow whose `ai.pii` steps we append custom patterns to.
 */
const BEFORE_PROMPT_WORKFLOW_ID = 'default-pii-anonymization-before-completion';

/**
 * Flag field stored in the workflow definition metadata to record that the
 * migration has already run. Prevents re-running on subsequent restarts.
 */
const MIGRATION_FLAG_KEY = 'legacyAnonymizationMigrated';

interface LegacyRegexRule {
  type: 'RegExp';
  enabled: boolean;
  pattern: string;
  entityClass: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLegacyRegexRule = (rule: unknown): rule is LegacyRegexRule =>
  isRecord(rule) &&
  rule.type === 'RegExp' &&
  typeof rule.enabled === 'boolean' &&
  typeof rule.pattern === 'string' &&
  typeof rule.entityClass === 'string';

const extractEnabledRegexRules = (
  settingsString: string
): Array<{ pattern: string; entityClass: string }> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsString);
  } catch {
    return [];
  }
  const ruleList = isRecord(parsed) && Array.isArray(parsed.rules) ? parsed.rules : [];
  return ruleList
    .filter((rule): rule is LegacyRegexRule => isLegacyRegexRule(rule) && rule.enabled)
    .map(({ pattern, entityClass }) => ({ pattern, entityClass }));
};

const applyCustomPatternsToDefinition = (
  definition: Record<string, unknown>,
  customPatterns: Array<{ pattern: string; entityClass: string }>
): Record<string, unknown> => {
  const updated = JSON.parse(JSON.stringify(definition)) as Record<string, unknown>;

  const steps = updated.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      if (isRecord(step) && step.type === 'ai.pii' && isRecord(step.with)) {
        const stepWith = step.with as Record<string, unknown>;
        const existing = Array.isArray(stepWith.customPatterns) ? stepWith.customPatterns : [];
        stepWith.customPatterns = [...(existing as Array<unknown>), ...customPatterns];
      }
    }
  }

  if (!isRecord(updated.metadata)) {
    updated.metadata = {};
  }
  (updated.metadata as Record<string, unknown>)[MIGRATION_FLAG_KEY] = true;

  return updated;
};

const getCustomPatternsFromSetting = async (
  core: CoreStart
): Promise<Array<{ pattern: string; entityClass: string }>> => {
  const scopedClient = core.savedObjects.getUnsafeInternalClient().asScopedToNamespace('default');
  const uiSettingsClient = core.uiSettings.asScopedToClient(scopedClient);

  let settingsString: string | undefined;
  try {
    settingsString = await uiSettingsClient.get<string | undefined>(
      LEGACY_ANONYMIZATION_UI_SETTING_KEY
    );
  } catch {
    return [];
  }

  return settingsString ? extractEnabledRegexRules(settingsString) : [];
};

type StorageClient = ReturnType<WorkflowStorage['getClient']>;

const loadWorkflowDefinition = async (
  client: StorageClient,
  logger: Logger
): Promise<{
  source: NonNullable<Awaited<ReturnType<StorageClient['get']>>['_source']>;
  definition: Record<string, unknown>;
} | null> => {
  let workflowDoc: Awaited<ReturnType<typeof client.get>>;
  try {
    workflowDoc = await client.get({ id: BEFORE_PROMPT_WORKFLOW_ID });
  } catch (err) {
    if (isResponseError(err) && err.statusCode === 404) {
      logger.debug(
        '[migrateAnonymizationSettings] Before-prompt workflow not found — skipping migration'
      );
      return null;
    }
    logger.warn(
      `[migrateAnonymizationSettings] Failed to load workflow "${BEFORE_PROMPT_WORKFLOW_ID}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }

  const { _source: source } = workflowDoc;
  if (!source?.definition) {
    return null;
  }

  if (source.deleted_at) {
    logger.debug('[migrateAnonymizationSettings] Workflow is soft-deleted — skipping migration');
    return null;
  }

  const definition = source.definition as Record<string, unknown>;
  const metadata = definition.metadata;
  if (isRecord(metadata) && metadata[MIGRATION_FLAG_KEY] === true) {
    logger.debug('[migrateAnonymizationSettings] Migration already applied — skipping');
    return null;
  }

  return { source, definition };
};

/**
 * Appends custom regex patterns extracted from the legacy `ai:anonymizationSettings`
 * UI setting into the `customPatterns` field of every `ai.pii` step in the seeded
 * before-completion workflow document.
 *
 * This is a one-shot migration: if the workflow document already has the migration
 * flag set, or if the legacy setting is absent/empty, the function returns without
 * making any changes.
 *
 * Called from `WorkflowsPlugin.start()` after `seedDefaultWorkflows` completes.
 */
export const migrateLegacyAnonymizationSettings = async (
  core: CoreStart,
  storage: WorkflowStorage,
  logger: Logger
): Promise<void> => {
  const customPatterns = await getCustomPatternsFromSetting(core);
  if (!customPatterns.length) {
    return;
  }

  const client = storage.getClient();
  const loaded = await loadWorkflowDefinition(client, logger);
  if (!loaded) {
    return;
  }

  const { source, definition } = loaded;
  const updatedDefinition = applyCustomPatternsToDefinition(definition, customPatterns);
  const updatedYaml = stringifyWorkflowDefinition(updatedDefinition);

  try {
    await client.index({
      id: BEFORE_PROMPT_WORKFLOW_ID,
      document: {
        ...source,
        yaml: updatedYaml,
        definition: updatedDefinition as unknown as WorkflowYaml,
        updated_at: new Date().toISOString(),
      },
      refresh: 'wait_for',
    });
    logger.info(
      `[migrateAnonymizationSettings] Migrated ${customPatterns.length} regex rule(s) into "${BEFORE_PROMPT_WORKFLOW_ID}"`
    );
  } catch (indexErr) {
    logger.warn(
      `[migrateAnonymizationSettings] Failed to update workflow "${BEFORE_PROMPT_WORKFLOW_ID}": ${
        indexErr instanceof Error ? indexErr.message : String(indexErr)
      }`
    );
  }
};
