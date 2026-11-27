/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, relative } from 'path';
import { formatWithOxfmt } from '@kbn/oxfmt';
import { REPO_ROOT } from '@kbn/repo-info';

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */`;

export const formatGeneratedFile = async ({
  path,
  content,
}: GeneratedFile): Promise<GeneratedFile> => {
  const source = content.trimStart().startsWith(LICENSE_HEADER)
    ? content
    : `${LICENSE_HEADER}\n\n${content}`;

  return { path, content: await formatWithOxfmt(relative(REPO_ROOT, path), source) };
};

export const writeGeneratedFiles = async (files: readonly GeneratedFile[]): Promise<void> => {
  for (const { path, content } of files) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
};
