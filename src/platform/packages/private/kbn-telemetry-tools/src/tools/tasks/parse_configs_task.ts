/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import { parseTelemetryRC } from '../config';
import type { TaskContext } from './task_context';

/**
 * Check if a config root matches any of the filter patterns
 */
function matchesRootFilter(configRoot: string, rootFilter: string[] | undefined): boolean {
  if (!rootFilter || rootFilter.length === 0) {
    return true; // No filter, include all
  }

  // Normalize the config root for comparison
  const normalizedConfigRoot = configRoot.replace(/\\/g, '/');

  return rootFilter.some((filter) => {
    const normalizedFilter = filter.replace(/\\/g, '/');
    // Check if the config root contains the filter pattern
    return (
      normalizedConfigRoot.includes(normalizedFilter) ||
      normalizedConfigRoot.endsWith(normalizedFilter) ||
      normalizedFilter.includes(normalizedConfigRoot)
    );
  });
}

export function parseConfigsTask(rootFilter?: string[]) {
  const kibanaRoot = process.cwd();
  const xpackRoot = path.join(kibanaRoot, 'x-pack');

  const configRoots = [kibanaRoot, xpackRoot];

  return configRoots.map((configRoot) => ({
    task: async (context: TaskContext) => {
      try {
        const configs = await parseTelemetryRC(configRoot);
        configs.forEach((config) => {
          // Apply root filter if provided
          if (matchesRootFilter(config.root, rootFilter)) {
            context.roots.push({ config });
          }
        });
      } catch (err) {
        const { reporter } = context;
        const reporterWithContext = reporter.withContext({ name: configRoot });
        reporterWithContext.report(err);
        throw reporter;
      }
    },
    title: `Parsing configs in ${configRoot}`,
  }));
}
