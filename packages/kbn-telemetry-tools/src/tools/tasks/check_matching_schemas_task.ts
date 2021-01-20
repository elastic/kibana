/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as path from 'path';
import { TaskContext } from './task_context';
import { checkMatchingMapping } from '../check_collector_integrity';
import { readFileAsync } from '../utils';

export function checkMatchingSchemasTask({ roots }: TaskContext, throwOnDiff: boolean) {
  return roots.map((root) => ({
    task: async () => {
      const fullPath = path.resolve(process.cwd(), root.config.output);
      const esMappingString = await readFileAsync(fullPath, 'utf-8');
      const esMapping = JSON.parse(esMappingString);

      if (root.parsedCollections) {
        const differences = checkMatchingMapping(root.parsedCollections, esMapping);
        root.esMappingDiffs = Object.keys(differences);
        if (root.esMappingDiffs.length && throwOnDiff) {
          throw Error(
            `The following changes must be persisted in ${fullPath} file. Use '--fix' to update.\n${JSON.stringify(
              differences,
              null,
              2
            )}`
          );
        }
      }
    },
    title: `Checking in ${root.config.root}`,
  }));
}
