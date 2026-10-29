/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { writeGeneratedFiles } from './lib/generated_file';
import {
  GENERATED_FILE_GROUPS,
  renderGeneratedFiles,
  type GeneratedFileGroup,
} from './generated_files';

const isGeneratedFileGroup = (value: string): value is GeneratedFileGroup =>
  (GENERATED_FILE_GROUPS as readonly string[]).includes(value);

// Usage: generate.ts [definitions] [documentation] — generates every group when none is given
const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const unknownArgs = args.filter((arg) => !isGeneratedFileGroup(arg));
  if (unknownArgs.length > 0) {
    throw new Error(
      `Unknown group(s): ${unknownArgs.join(', ')}. Expected: ${GENERATED_FILE_GROUPS.join(', ')}`
    );
  }

  const groups = args.length > 0 ? args.filter(isGeneratedFileGroup) : GENERATED_FILE_GROUPS;
  const files = renderGeneratedFiles(groups);
  await writeGeneratedFiles(files);

  const fileList = files.map(({ path }) => `  ${relative(REPO_ROOT, path)}`).join('\n');
  process.stdout.write(`Generated ${files.length} files (${groups.join(', ')}):\n${fileList}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
