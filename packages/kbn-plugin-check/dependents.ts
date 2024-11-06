/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { getAllPlugins } from './lib';

interface Dependents {
  required: readonly string[];
  optional: readonly string[];
  bundles?: readonly string[];
}

export const findDependents = (plugin: string, log: ToolingLog): Dependents => {
  log.info(`Finding dependents for ${plugin}`);
  const plugins = getAllPlugins(log);
  const required: string[] = [];
  const optional: string[] = [];
  const bundles: string[] = [];

  plugins.forEach((p) => {
    const manifest = p.manifest;

    if (manifest.requiredPlugins?.includes(plugin)) {
      required.push(manifest.id);
    }

    if (manifest.optionalPlugins?.includes(plugin)) {
      optional.push(manifest.id);
    }

    if (manifest.requiredBundles?.includes(plugin)) {
      bundles.push(manifest.id);
    }
  });

  if (required.length === 0 && optional.length === 0 && bundles.length === 0) {
    log.info(`No plugins depend on ${plugin}`);
  }

  if (required.length > 0) {
    log.info(`REQUIRED BY ${required.length}:\n${required.join('\n')}\n`);
  }

  if (optional.length > 0) {
    log.info(`OPTIONAL FOR ${optional.length}:\n${optional.join('\n')}\n`);
  }

  if (bundles.length > 0) {
    log.info(`BUNDLE FOR ${bundles.length}:\n${bundles.join('\n')}\n`);
  }

  return {
    required,
    optional,
    bundles,
  };
};
