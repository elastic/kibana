/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import { writeFile } from 'fs/promises';
import { TaskContext } from './task_context';

export function writeToFileTask({ roots }: TaskContext) {
  return roots.map((root) => ({
    task: async () => {
      const fullPath = path.resolve(process.cwd(), root.config.output);
      if (root.mapping && Object.keys(root.mapping.properties).length > 0) {
        // Sort first-level properties alphabetically
        root.mapping.properties = Object.fromEntries(
          Object.entries(root.mapping.properties).sort(([a], [b]) => {
            return a > b ? 1 : -1;
          })
        );
        const serializedMapping = JSON.stringify(root.mapping, null, 2).concat('\n');
        await writeFile(fullPath, serializedMapping);
      }
    },
    title: `Writing mapping for ${root.config.root}`,
  }));
}
