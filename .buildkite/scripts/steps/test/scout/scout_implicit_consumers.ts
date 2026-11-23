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

import { execFileSync } from 'node:child_process';
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
  /**
   * When set, a changed file matching `patterns` only triggers the rule when its current content,
   * or a line the change adds or removes, matches this pattern. It must be valid both as a
   * JavaScript RegExp and as a POSIX extended regex (for `git diff -G`): stick to literals and `|`.
   */
  contentPattern?: string;
  consumers: readonly string[];
}

/** Gives content rules access to the changed files. */
export interface ChangedContent {
  /** Returns a changed file's current content, or `undefined` when the change deleted it. */
  readFile: (file: string) => string | undefined;
  /** Returns the changed files where an added or removed line matches `pattern`. */
  getFilesWithChangedLinesMatching: (pattern: string) => ReadonlySet<string>;
}

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
    // Matching the added and removed lines, not only the current content, also catches deleted
    // step files and removed registrations: the changes that leave a step registered on one side.
    // Known gap: removing a call to a plugin helper that registers its steps (for example
    // `registerCaseWorkflowSteps(...)`) is not caught, because that line doesn't name the step API.
    contentPattern:
      'registerStepDefinition|createServerStepDefinition|createPollServerStepDefinition|createPublicStepDefinition|CommonStepDefinition',
    consumers: ['@kbn/workflows-extensions'],
  },
];

/**
 * Reads the changed files from the working tree, and the changed lines from its diff against the
 * merge base with `mergeBase`. In CI the working tree is the PR's head commit.
 */
export const createGitChangedContent = (mergeBase: string): ChangedContent => {
  const git = (args: readonly string[]): string =>
    execFileSync('git', args, {
      cwd: getKibanaDir(),
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  const filesByPattern = new Map<string, ReadonlySet<string>>();

  return {
    readFile: (file) => {
      const filePath = path.resolve(getKibanaDir(), file);
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
    },
    getFilesWithChangedLinesMatching: (pattern) => {
      const cached = filesByPattern.get(pattern);
      if (cached) return cached;

      const base = git(['merge-base', mergeBase, 'HEAD']).trim();
      const files = new Set(
        git(['diff', '--name-only', `-G${pattern}`, base])
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      );
      filesByPattern.set(pattern, files);
      return files;
    },
  };
};

const matchesRule = (
  rule: ImplicitConsumerRule,
  file: string,
  changedContent: ChangedContent
): boolean => {
  const { patterns, contentPattern } = rule;
  if (!patterns.some((pattern) => minimatch(file, pattern, { dot: true }))) return false;
  if (!contentPattern) return true;
  if (changedContent.getFilesWithChangedLinesMatching(contentPattern).has(file)) return true;

  const content = changedContent.readFile(file);
  return content !== undefined && new RegExp(contentPattern).test(content);
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
  changedContent: ChangedContent
): Set<string> {
  const expanded = new Set(affected);
  const relevantFiles = filterIgnoredFiles([...changedFiles], SCOUT_MODULE_GRAPH_IGNORE);

  for (const rule of IMPLICIT_REGISTRY_CONSUMERS) {
    // Check the consumers first, so content rules don't read files when there is nothing to add.
    const added = rule.consumers.filter((id) => !expanded.has(id));
    if (added.length === 0) continue;

    const trigger = relevantFiles.find((file) => matchesRule(rule, file, changedContent));
    if (!trigger) continue;

    for (const id of added) expanded.add(id);
    log.info(
      `Implicit consumers added: ${added.join(', ')} (triggered by '${trigger}' — ${rule.reason})`
    );
  }

  return expanded;
}
