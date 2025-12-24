/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const PKG_JSON_PATH = resolve(REPO_ROOT, 'package.json');
const FIELDS_TO_CHECK = ['dependencies', 'devDependencies', 'resolutions', 'engines'] as const;
const pkg = JSON.parse(readFileSync(PKG_JSON_PATH, 'utf-8'));

type FieldName = (typeof FIELDS_TO_CHECK)[number];

let totalFixes = 0;
const fixesPerField: Partial<Record<FieldName, number>> = {};

for (const field of FIELDS_TO_CHECK) {
  const deps = pkg[field];
  if (!deps || typeof deps !== 'object') continue;

  for (const [name, version] of Object.entries(deps)) {
    if (typeof version !== 'string') continue;

    if (version.startsWith('^') || version.startsWith('~')) {
      deps[name] = version.slice(1);
      totalFixes++;

      fixesPerField[field] = (fixesPerField[field] ?? 0) + 1;
    }
  }
}

if (totalFixes > 0) {
  writeFileSync(PKG_JSON_PATH, JSON.stringify(pkg, null, 2));

  const fieldsSummary = Object.entries(fixesPerField)
    .map(([field, count]) => `${field}: ${count}`)
    .join(', ');

  // eslint-disable-next-line no-console
  console.warn(
    `[no-pkg-semver-ranges] Removed ^/~ from ${totalFixes} version(s) ` +
      `in package.json (${fieldsSummary})`
  );
}
