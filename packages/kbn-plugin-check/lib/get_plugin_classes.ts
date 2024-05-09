/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from 'ts-morph';

import { ToolingLog } from '@kbn/tooling-log';
import { PluginOrPackage } from '@kbn/docs-utils/src/types';

/**
 * Return the `client` and `server` plugin classes for a plugin.
 */
export const getPluginClasses = (project: Project, plugin: PluginOrPackage, log: ToolingLog) => {
  // The `client` and `server` plugins have a consistent name and directory structure, but the
  // `client` plugin _may_ be a `.tsx` file, so we need to check for both.
  let client = project.getSourceFile(`${plugin.directory}/public/plugin.ts`);

  if (!client) {
    client = project.getSourceFile(`${plugin.directory}/public/plugin.tsx`);
  }

  const server = project.getSourceFile(`${plugin.directory}/server/plugin.ts`);

  // Log the warning if one or both plugin implementations are missing.
  if (!client || !server) {
    if (!client) {
      log.warning(`${plugin.id}/client: no plugin.`);
    }

    if (!server) {
      log.warning(`${plugin.id}/server: no plugin.`);
    }
  }

  // We restrict files to a single class, so assigning the first element from the
  // resulting array should be fine.
  return {
    project,
    client: client ? client.getClasses()[0] : null,
    server: server ? server.getClasses()[0] : null,
  };
};
