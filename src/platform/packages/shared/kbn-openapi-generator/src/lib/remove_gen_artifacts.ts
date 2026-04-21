/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import globby from 'globby';
import { resolve } from 'path';

/**
 * Removes any *.gen.ts files from the target directory and, when provided,
 * also removes the generated types-only barrel index file.
 *
 * @param folderPath target directory
 * @param typesOnlyIndexPath optional path to the generated types/index.ts barrel
 */
export async function removeGenArtifacts(folderPath: string, typesOnlyIndexPath?: string) {
  const patterns = [resolve(folderPath, './**/*.gen.ts')];
  if (typesOnlyIndexPath) {
    patterns.push(typesOnlyIndexPath);
  }
  const artifactsPath = await globby(patterns);

  await Promise.all(artifactsPath.map((artifactPath) => fs.unlink(artifactPath)));
}
