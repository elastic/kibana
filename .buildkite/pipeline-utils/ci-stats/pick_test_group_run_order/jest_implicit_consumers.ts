/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Overlay for Jest selective testing when the dependency graph misses a real consumer.
 *
 * - encrypted_saved_objects: ci_checks snapshots every registered encrypted SO type, but
 *   publishers (alerting, actions, fleet, …) sit upstream so includeDownstream skips them.
 * - kbn-plugin-helpers: build integration tests exercise generate_plugin from
 *   @kbn/plugin-generator, which does not depend on @kbn/plugin-helpers.
 */

import { minimatch } from 'minimatch';

interface ImplicitConsumerRule {
  reason: string;
  patterns: readonly string[];
  consumers: readonly string[];
}

const ENCRYPTED_SAVED_OBJECTS_PLUGIN = '@kbn/encrypted-saved-objects-plugin';

const IMPLICIT_JEST_CONSUMERS: readonly ImplicitConsumerRule[] = [
  {
    reason:
      'Encrypted SO registration, model-version, or schema changes must refresh the ESO ci_checks snapshot.',
    patterns: [
      '**/server/saved_objects/index.{ts,tsx}',
      '**/server/saved_objects/model_versions/**/*.{ts,tsx}',
      '**/server/saved_objects/schemas/**/*.{ts,tsx}',
      '**/packages/**/server/saved_objects/index.{ts,tsx}',
      '**/packages/**/server/saved_objects/model_versions/**/*.{ts,tsx}',
      '**/packages/**/server/saved_objects/schemas/**/*.{ts,tsx}',
    ],
    consumers: [ENCRYPTED_SAVED_OBJECTS_PLUGIN],
  },
  {
    reason:
      'Plugin generator changes must re-run kbn-plugin-helpers generate/build integration tests.',
    patterns: ['packages/kbn-plugin-generator/**/*'],
    consumers: ['@kbn/plugin-helpers'],
  },
];

export function expandJestImplicitConsumers(
  affected: ReadonlySet<string>,
  changedFiles: readonly string[]
): Set<string> {
  const expanded = new Set(affected);

  for (const rule of IMPLICIT_JEST_CONSUMERS) {
    const trigger = changedFiles.find((file) =>
      rule.patterns.some((pattern) => minimatch(file, pattern, { dot: true }))
    );
    if (!trigger) continue;

    for (const id of rule.consumers) {
      if (!expanded.has(id)) {
        expanded.add(id);
        console.log(
          `Implicit Jest consumer added: ${id} (triggered by '${trigger}' — ${rule.reason})`
        );
      }
    }
  }

  return expanded;
}
