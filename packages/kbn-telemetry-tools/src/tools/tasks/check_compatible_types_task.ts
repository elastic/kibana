/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TaskContext } from './task_context';
import { checkCompatibleTypeDescriptor } from '../check_collector_integrity';

export function checkCompatibleTypesTask({ reporter, roots }: TaskContext) {
  return roots.map((root) => ({
    task: async () => {
      if (root.parsedCollections) {
        const differences = checkCompatibleTypeDescriptor(root.parsedCollections);
        const reporterWithContext = reporter.withContext({ name: root.config.root });
        if (differences.length) {
          reporterWithContext.report(
            `${JSON.stringify(
              differences,
              null,
              2
            )}. \nPlease fix the collectors and run the check again.`
          );
          throw reporter;
        }
      }
    },
    title: `Checking in ${root.config.root}`,
  }));
}
