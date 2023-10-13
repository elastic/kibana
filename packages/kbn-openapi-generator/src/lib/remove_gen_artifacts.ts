/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import globby from 'globby';
import { resolve } from 'path';

/**
 * Removes any *.gen.ts files from the target directory
 *
 * @param folderPath target directory
 */
export async function removeGenArtifacts(folderPath: string) {
  const artifactsPath = await globby([resolve(folderPath, './**/*.gen.ts')]);

  await Promise.all(artifactsPath.map((artifactPath) => fs.unlink(artifactPath)));
}
