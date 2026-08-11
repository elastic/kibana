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
 * files change.
 */

import minimatch from 'minimatch';
import type { ToolingLog } from '@kbn/tooling-log';

interface ImplicitConsumerRule {
  reason: string;
  patterns: readonly string[];
  consumers: readonly string[];
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
];

/**
 * Augment an affected-modules set with consumer @kbn/ IDs whose registries are
 * touched by `changedFiles`. Returns a new Set; never removes entries and
 * never disables selective testing.
 */
export function expandWithImplicitConsumers(
  affected: ReadonlySet<string>,
  changedFiles: readonly string[],
  log: ToolingLog
): Set<string> {
  const expanded = new Set(affected);

  for (const rule of IMPLICIT_REGISTRY_CONSUMERS) {
    const trigger = changedFiles.find((file) =>
      rule.patterns.some((pattern) => minimatch(file, pattern, { dot: true }))
    );
    if (!trigger) continue;

    const added = rule.consumers.filter((id) => !expanded.has(id));
    if (added.length === 0) continue;

    for (const id of added) expanded.add(id);
    log.info(
      `Implicit consumers added: ${added.join(', ')} (triggered by '${trigger}' — ${rule.reason})`
    );
  }

  return expanded;
}
