/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SETTINGS_BLOCK = /^settings:\n/m;
const SPACE_ID = /^[a-z0-9_-]+$/;

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

/** Rejects anything that is not a Kibana space id, since it is rendered into a workflow id. */
export const assertSpaceId = (spaceId: string): string => {
  if (typeof spaceId !== 'string' || !SPACE_ID.test(spaceId)) {
    throw new Error(`Invalid space id for a bound Nightshift workflow: ${String(spaceId)}`);
  }
  return spaceId;
};
