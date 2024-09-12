/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TaskContext } from './task_context';
import { generateMapping } from '../manage_schema';

export function generateSchemasTask({ roots }: TaskContext) {
  return roots.map((root) => ({
    task: () => {
      if (!root.parsedCollections || !root.parsedCollections.length) {
        return;
      }
      const mapping = generateMapping(root.parsedCollections);
      root.mapping = mapping;
    },
    title: `Generating mapping for ${root.config.root}`,
  }));
}
