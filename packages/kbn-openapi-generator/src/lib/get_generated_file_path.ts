/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getGeneratedFilePath(sourcePath: string, extension: string, outputDir?: string) {
  const filePath = outputDir
    ? `${outputDir}/${sourcePath.substring(sourcePath.lastIndexOf('/') + 1)}`
    : sourcePath;

  // Remove any double extension like `.schema.yaml` or `.schema.yml` and replace with `.gen.ts`
  const secondToLastDot = filePath.lastIndexOf('.', filePath.lastIndexOf('.') - 1);
  return `${filePath.substring(0, secondToLastDot)}.${extension}.ts`;
}
