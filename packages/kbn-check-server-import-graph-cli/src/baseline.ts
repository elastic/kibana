/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';

/** Repo-relative importer path -> banned node modules it imports, both sorted. */
export type BaselineViolations = Record<string, string[]>;

interface BaselineFile {
  '//': string;
  violations: BaselineViolations;
}

const BASELINE_COMMENT =
  'Source files reachable from the Kibana server entry points that import browser-only node modules. ' +
  'This list may only shrink: fix the chain (move the browser-only code out of the module the server imports) ' +
  'and run `node scripts/check_server_import_graph --update-baseline` to remove the entry.';

export interface BaselineEntry {
  importer: string;
  nodeModule: string;
}

export interface BaselineDiff {
  /** Violations found now that are not in the baseline. */
  added: BaselineEntry[];
  /** Baseline entries that are no longer violations. */
  removed: BaselineEntry[];
}

export const readBaseline = (path: string): BaselineViolations => {
  if (!Fs.existsSync(path)) {
    return {};
  }
  const parsed = JSON.parse(Fs.readFileSync(path, 'utf8')) as Partial<BaselineFile>;
  return parsed.violations ?? {};
};

export const writeBaseline = (path: string, violations: BaselineViolations): void => {
  const sorted: BaselineViolations = {};
  for (const importer of Object.keys(violations).sort()) {
    sorted[importer] = [...new Set(violations[importer])].sort();
  }
  const file: BaselineFile = { '//': BASELINE_COMMENT, violations: sorted };
  Fs.writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
};

const toEntries = (violations: BaselineViolations): BaselineEntry[] =>
  Object.entries(violations).flatMap(([importer, nodeModules]) =>
    nodeModules.map((nodeModule) => ({ importer, nodeModule }))
  );

const entryKey = ({ importer, nodeModule }: BaselineEntry): string => `${importer}\0${nodeModule}`;

export const diffBaseline = (
  baseline: BaselineViolations,
  current: BaselineViolations
): BaselineDiff => {
  const baselineKeys = new Set(toEntries(baseline).map(entryKey));
  const currentKeys = new Set(toEntries(current).map(entryKey));

  return {
    added: toEntries(current).filter((entry) => !baselineKeys.has(entryKey(entry))),
    removed: toEntries(baseline).filter((entry) => !currentKeys.has(entryKey(entry))),
  };
};
