/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as path from 'path';
import { parseTelemetryRC } from '../config';
import { TaskContext } from './task_context';

export function parseConfigsTask() {
  const kibanaRoot = process.cwd();
  const xpackRoot = path.join(kibanaRoot, 'x-pack');

  const configRoots = [kibanaRoot, xpackRoot];

  return configRoots.map((configRoot) => ({
    task: async (context: TaskContext) => {
      try {
        const configs = await parseTelemetryRC(configRoot);
        configs.forEach((config) => {
          context.roots.push({ config });
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
