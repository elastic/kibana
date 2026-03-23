/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ExecaError } from 'execa';
import execa from 'execa';
import { toYamlSearchPath } from './path_filters';

export async function filtersMatch(paths: string[], yamlPath: string): Promise<boolean> {
  const searchTerms = Array.from(new Set(paths.map((pathFilter) => toYamlSearchPath(pathFilter))));

  try {
    await execa('grep', [
      '-F',
      '-q',
      '-s',
      '-r',
      ...searchTerms.flatMap((searchTerm) => ['-e', searchTerm]),
      yamlPath,
    ]);
    return true;
  } catch (error) {
    if ((error as ExecaError).exitCode === 1) {
      return false;
    }

    throw error;
  }
}
