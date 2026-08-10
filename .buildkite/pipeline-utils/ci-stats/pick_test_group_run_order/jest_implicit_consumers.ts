/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Overlay for Jest selective testing.
 *
 * The encrypted_saved_objects integration ci_checks test validates every
 * registered encrypted SO type at runtime, but lives in @kbn/encrypted-saved-objects-plugin
 * while publishers (alerting, actions, fleet, …) sit upstream in the dependency graph.
 * Publisher-only model-version changes therefore skip that config under includeDownstream.
 */

import minimatch from 'minimatch';

interface ImplicitConsumerRule {
  reason: string;
  patterns: readonly string[];
  consumers: readonly string[];
}

const ENCRYPTED_SAVED_OBJECTS_PLUGIN = '@kbn/encrypted-saved-objects-plugin';
const WORKFLOW_STEP_SCHEMA_CLI = '@kbn/workflow-step-schema-cli';

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
      'Changes to connector-type registrations, the workflows management plugin, or the ' +
      'workflows packages may alter the composed JSON Schema; regenerate the committed artifact.',
    patterns: [
      // Connector type registration surface (the two main locations)
      'x-pack/platform/plugins/shared/stack_connectors/server/connector_types/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/stack_connectors/server/connector_types_from_spec/**/*.{ts,tsx}',
      '**/server/connector_types/**/*.{ts,tsx}',
      // Workflows management plugin (owns the /api/workflows/schema route and schema composition)
      'src/platform/plugins/shared/workflows_management/**/*.{ts,tsx}',
      // Shared workflows packages (step/trigger definitions, schema helpers)
      'src/platform/packages/shared/kbn-workflows*/**/*.{ts,tsx}',
    ],
    consumers: [WORKFLOW_STEP_SCHEMA_CLI],
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
