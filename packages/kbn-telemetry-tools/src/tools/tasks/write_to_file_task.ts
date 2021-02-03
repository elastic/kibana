/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as path from 'path';
import { writeFileAsync } from '../utils';
import { TaskContext } from './task_context';

export function writeToFileTask({ roots }: TaskContext) {
  return roots.map((root) => ({
    task: async () => {
      const fullPath = path.resolve(process.cwd(), root.config.output);
      if (root.mapping && Object.keys(root.mapping.properties).length > 0) {
        const serializedMapping = JSON.stringify(root.mapping, null, 2).concat('\n');
        await writeFileAsync(fullPath, serializedMapping);
      }
    },
    title: `Writing mapping for ${root.config.root}`,
  }));
}
