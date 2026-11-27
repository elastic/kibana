/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import Path from 'node:path';
import { formatWithOxfmt } from '@kbn/oxfmt';
import { formatDuration } from './format_duration';

export async function formatGeneratedCode({ patterns }: { patterns: string[] }) {
  try {
    const startedAt = performance.now();
    console.log('3/3 Formatting generated code...');
    const files = fs.globSync(patterns);

    // The generated folders are excluded from linting and from .oxfmtrc.json. Linting them with
    // `--no-ignore` applies rules not meant for generated code (and half-applied autofixes), so
    // only format them, passing the basename so oxfmt's ignore patterns don't skip the file.
    await Promise.all(
      files.map(async (file) => {
        const source = fs.readFileSync(file, 'utf8');
        fs.writeFileSync(file, await formatWithOxfmt(Path.basename(file), source));
      })
    );

    console.log(`✅ Generated code formatted in ${formatDuration(startedAt, performance.now())}`);
  } catch (error) {
    console.error('❌ Failed to format generated code:', error);
    return false;
  }
}
