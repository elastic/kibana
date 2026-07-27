/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * The `workflows_extensions` Scout fixtures that govern which step/trigger
 * definitions are approved. Approved step ids are one-per-file under
 * `approved_step_definitions/<id>.txt`; approved trigger ids live in the
 * `APPROVED_TRIGGER_DEFINITIONS` array in `approved_trigger_definitions.ts`.
 */
export const DEFAULT_FIXTURES_DIR = Path.resolve(
  REPO_ROOT,
  'src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures'
);

export interface ApprovedDefinitions {
  stepIds: string[];
  triggerIds: string[];
}

/**
 * Parse the approved trigger ids out of `approved_trigger_definitions.ts`.
 *
 * The file is read from disk (not imported): it lives inside a plugin's Scout
 * test fixtures, which a package cannot import through a public module entry.
 * We only extract `id` values that are immediately followed by a `schemaHash`
 * property - the shape of a real entry - so the illustrative `id` in the file's
 * docstring, inline `// ... id: '...'` comments, and any other stray `id:`
 * occurrences are ignored. This is more robust than stripping line comments,
 * which could corrupt a string value that legitimately contains `//`.
 */
export const parseApprovedTriggerIds = (source: string): string[] => {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const ids = new Set<string>();
  const idPattern = /id:\s*'([^']+)'\s*,\s*schemaHash:/g;
  let match: RegExpExecArray | null;
  while ((match = idPattern.exec(withoutBlockComments)) !== null) {
    ids.add(match[1]);
  }
  return [...ids].sort();
};

export const loadApprovedDefinitions = (
  fixturesDir: string = DEFAULT_FIXTURES_DIR
): ApprovedDefinitions => {
  const stepDir = Path.join(fixturesDir, 'approved_step_definitions');
  const stepIds = Fs.readdirSync(stepDir)
    .filter((file) => file.endsWith('.txt'))
    .map((file) => file.slice(0, -'.txt'.length))
    .sort();

  const triggerFile = Path.join(fixturesDir, 'approved_trigger_definitions.ts');
  const triggerIds = parseApprovedTriggerIds(Fs.readFileSync(triggerFile, 'utf8'));

  return { stepIds, triggerIds };
};

export interface DefinitionDiff {
  /** Approved ids that are absent from the produced artifact. */
  missing: string[];
  /** Produced ids that are not in the approved list. */
  unexpected: string[];
}

export const diffDefinitions = (approved: string[], produced: string[]): DefinitionDiff => {
  const approvedSet = new Set(approved);
  const producedSet = new Set(produced);
  return {
    missing: approved.filter((id) => !producedSet.has(id)).sort(),
    unexpected: produced.filter((id) => !approvedSet.has(id)).sort(),
  };
};

export interface FixtureDeviationReport {
  steps: DefinitionDiff;
  triggers: DefinitionDiff;
}

export const buildFixtureDeviationReport = (
  approved: ApprovedDefinitions,
  produced: { stepTypes: string[]; triggerTypes: string[] }
): FixtureDeviationReport => ({
  steps: diffDefinitions(approved.stepIds, produced.stepTypes),
  triggers: diffDefinitions(approved.triggerIds, produced.triggerTypes),
});
