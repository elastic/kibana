/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SETTINGS_BLOCK = /^settings:\n/m;

/** Inserts `settings.run_as` into a workflow YAML that has a top-level `settings` block. */
export const renderRunAs = (yaml: string, serviceAccountId: string): string => {
  if (typeof serviceAccountId !== 'string' || serviceAccountId.trim().length === 0) {
    throw new Error('A bound Nightshift workflow requires a serviceAccountId');
  }
  if (!SETTINGS_BLOCK.test(yaml)) {
    throw new Error('The workflow YAML has no top-level settings block');
  }
  return yaml.replace(SETTINGS_BLOCK, `settings:\n  run_as: ${JSON.stringify(serviceAccountId)}\n`);
};
