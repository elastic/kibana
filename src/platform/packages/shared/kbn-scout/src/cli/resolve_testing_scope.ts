/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { readCodeChanges } from '../tests_discovery/code_changes';
import { resolveScoutTestingScope, writeScoutTestingScope } from '../tests_discovery/testing_scope';

/**
 * Resolve the Scout selective-testing scope for a PR diff and publish it as a
 * small JSON artifact. This command is the single producer of
 * `testing_scope.json`; every downstream Scout step (discover-playwright-configs,
 * create-test-tracks) and cross-pipeline consumer (FTR/Jest skip) reads from it.
 *
 * Strategy-agnostic: runs once in the shared prelude of the Scout Test Run
 * Builder step, before either the configs or lanes branch executes.
 */
export const runResolveTestingScope = (flagsReader: FlagsReader, log: ToolingLog): void => {
  const codeChangesPath = flagsReader.string('code-changes');
  const outputPath = flagsReader.requiredString('scope-output');
  const selectiveTesting = flagsReader.boolean('selective-testing');

  const codeChanges = codeChangesPath ? readCodeChanges(codeChangesPath) : null;
  const scope = resolveScoutTestingScope(codeChanges, selectiveTesting, log);
  const affectedModules = new Set(codeChanges?.affectedModules ?? []);

  writeScoutTestingScope(scope, affectedModules, outputPath);
  log.info(`Scout testing scope written to '${outputPath}' (kind: ${scope.kind})`);
};

export const resolveTestingScopeCmd: Command<void> = {
  name: 'resolve-testing-scope',
  description: `
  Resolve the Scout selective-testing scope for a PR diff and write it to disk
  as a hand-off artifact. The output is consumed by:
    - 'discover-playwright-configs' (configs strategy filter)
    - 'create-test-tracks'          (lanes strategy filter)

  Options:
    --code-changes <file>     Path to a JSON file describing the PR's diff:
                                { "mergeBase": string, "changedFiles": string[],
                                  "affectedModules": string[] }
                              When omitted, the scope is { kind: 'full',
                              reason: 'selective-disabled' }.
    --scope-output <file>     (required) Output path for the resolved scope JSON.
    --selective-testing       Enable selective testing. Without it, the scope is
                              always { kind: 'full', reason: 'selective-disabled' }
                              regardless of --code-changes. With it, the scope is
                              auto-selected:
                                1. Critical Scout files touched -> kind: 'full'
                                2. Diff is exclusively Scout tests -> 'tests-only'
                                3. Otherwise -> 'dependency-tree'

  Example:
    node scripts/scout resolve-testing-scope \\
      --code-changes .scout/code_changes.json \\
      --scope-output .scout/testing_scope.json \\
      --selective-testing
  `,
  flags: {
    string: ['code-changes', 'scope-output'],
    boolean: ['selective-testing'],
    default: {
      'selective-testing': false,
    },
  },
  run: ({ flagsReader, log }) => {
    runResolveTestingScope(flagsReader, log);
  },
};
