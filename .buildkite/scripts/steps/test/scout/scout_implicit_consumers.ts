/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TEMPORARY overlay for Scout selective testing.
 *
 * The static @kbn/ dependency graph (kibana.jsonc + tsconfig kbn_references)
 * cannot model runtime registry coupling — e.g. ML registers actions into the
 * uiActions registry that Dashboard renders at run time, with no static import
 * edge between them. ML-only changes therefore do not mark Dashboard's Scout
 * tests as affected and registration races slip through.
 *
 * This overlay augments the affected-modules set with a small allowlist of
 * (patterns -> consumer @kbn/ IDs) entries when the corresponding publisher
 * files change. Rules can also match on file content, for publishers that
 * don't follow a common path convention.
 */

import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { filterIgnoredFiles } from '../../../../pipeline-utils/affected-packages/utils.ts';
import { getKibanaDir } from '../../../../pipeline-utils/get_kibana_dir.ts';
import type { ScoutLog } from './scout_log.ts';
import { SCOUT_MODULE_GRAPH_IGNORE } from './scout_module_graph_ignore.ts';

interface ImplicitConsumerRule {
  reason: string;
  /** Globs matched against the changed file paths. */
  patterns: readonly string[];
  /** When set, a changed file matching `patterns` also needs content matching this to trigger the rule. */
  contentPattern?: RegExp;
  consumers: readonly string[];
}

/** Returns a changed file's content, or `undefined` when the change deleted it. */
export type ChangedFileReader = (file: string) => string | undefined;

const IMPLICIT_REGISTRY_CONSUMERS: readonly ImplicitConsumerRule[] = [
  {
    reason: 'Runtime registry coupling not captured by static @kbn/ references.',
    patterns: [
      '**/plugins/**/public/embeddables/**/*.{ts,tsx}',
      '**/plugins/**/public/embeddable/**/*.{ts,tsx}',
      '**/plugins/**/public/react_embeddable/**/*.{ts,tsx}',
      '**/plugins/**/public/apps/embeddables/**/*.{ts,tsx}',
      '**/plugins/**/public/ui_actions/**/*.{ts,tsx}',
      '**/plugins/**/public/trigger_actions/**/*.{ts,tsx}',
      '**/plugins/**/public/**/actions/register*.{ts,tsx}',
    ],
    consumers: [
      '@kbn/dashboard-plugin',
      '@kbn/embeddable-plugin',
      '@kbn/canvas-plugin',
      '@kbn/lens-plugin',
    ],
  },
  {
    reason:
      'Workflow triggers are registered into workflows_extensions at runtime. Changes to these files would not select the trigger-approval tests by default.',
    patterns: [
      '**/common/triggers/**/*.{ts,tsx}',
      '**/common/workflows/triggers/**/*.{ts,tsx}',
      '**/common/workflow/triggers/**/*.{ts,tsx}',
      '**/server/triggers/**/*.{ts,tsx}',
      '**/server/workflows/triggers/**/*.{ts,tsx}',
      '**/server/workflow/triggers/**/*.{ts,tsx}',
      '**/public/triggers/**/*.{ts,tsx}',
      '**/public/workflows/triggers/**/*.{ts,tsx}',
      '**/public/workflow/triggers/**/*.{ts,tsx}',
      '**/workflow_extensions/**/*.{ts,tsx}',
      '**/register_trigger_definitions.ts',
    ],
    consumers: ['@kbn/workflows-extensions'],
  },
  {
    reason:
      'Custom workflow steps are defined and registered into workflows_extensions at runtime, from files without a common path convention. Changes to these files would not select the step registration tests by default.',
    patterns: ['**/*.{ts,tsx}'],
    contentPattern:
      /\b(?:registerStepDefinition|createServerStepDefinition|createPollServerStepDefinition|createPublicStepDefinition|CommonStepDefinition)\b/,
    consumers: ['@kbn/workflows-extensions'],
  },
];

const readChangedFile: ChangedFileReader = (file) => {
  const filePath = path.resolve(getKibanaDir(), file);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
};

const matchesRule = (
  rule: ImplicitConsumerRule,
  file: string,
  readFile: ChangedFileReader
): boolean => {
  const { patterns, contentPattern } = rule;
  if (!patterns.some((pattern) => minimatch(file, pattern, { dot: true }))) return false;
  if (!contentPattern) return true;

  const content = readFile(file);
  return content !== undefined && contentPattern.test(content);
};

/**
 * Augment an affected-modules set with consumer @kbn/ IDs whose registries are
 * touched by `changedFiles`. Files in SCOUT_MODULE_GRAPH_IGNORE (docs, Jest
 * tests) never trigger consumers. Returns a new Set; never removes entries and
 * never disables selective testing.
 */
export function expandWithImplicitConsumers(
  affected: ReadonlySet<string>,
  changedFiles: readonly string[],
  log: ScoutLog,
  readFile: ChangedFileReader = readChangedFile
): Set<string> {
  const expanded = new Set(affected);
  const relevantFiles = filterIgnoredFiles([...changedFiles], SCOUT_MODULE_GRAPH_IGNORE);

  for (const rule of IMPLICIT_REGISTRY_CONSUMERS) {
    // Check the consumers first, so content rules don't read files when there is nothing to add.
    const added = rule.consumers.filter((id) => !expanded.has(id));
    if (added.length === 0) continue;

    const trigger = relevantFiles.find((file) => matchesRule(rule, file, readFile));
    if (!trigger) continue;

    for (const id of added) expanded.add(id);
    log.info(
      `Implicit consumers added: ${added.join(', ')} (triggered by '${trigger}' — ${rule.reason})`
    );
  }

  return expanded;
}
