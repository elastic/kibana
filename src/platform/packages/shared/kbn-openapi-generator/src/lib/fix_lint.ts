/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { globby } from 'globby';
import { REPO_ROOT } from '@kbn/repo-info';

export async function fixLint(pattern: string) {
  // Oxlint does not expand globs, so pass it the generated files explicitly.
  const files = await globby([pattern]);
  if (files.length === 0) {
    return;
  }

  const options = {
    // Need to run the linter from the Kibana root directory, otherwise it will not
    // be able to pick up the right config
    cwd: REPO_ROOT,
    // The generator is invoking the linter in a deliberate "apply auto-fixes"
    // post-process step. Some rules (e.g. @kbn/imports/no_unused_imports) gate
    // fix-vs-suggest on whether they detect an editor env (VSCODE_CWD, JetBrains,
    // etc.). Setting IS_KIBANA_PRECOMIT_HOOK forces the non-editor branch so the
    // generator output is deterministic regardless of the invoking shell —
    // otherwise running `pnpm openapi:generate` from a VSCode/Cursor terminal
    // leaves dead imports the fix-step can't remove.
    env: { ...process.env, IS_KIBANA_PRECOMIT_HOOK: '1' },
  };
  const args = ['scripts/lint', '--fix', ...files];

  // Oxlint applies fixes in a single pass and skips overlapping ones (e.g. adding the required
  // license header and removing the template's disallowed one), so the first pass may still
  // report errors the second pass fixes.
  await execa(process.execPath, args, { ...options, reject: false });
  await execa(process.execPath, args, options);
}
