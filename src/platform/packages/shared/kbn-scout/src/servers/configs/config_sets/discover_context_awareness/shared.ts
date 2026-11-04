/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `discover.experimental.enabledProfiles` is read once when the Discover server plugin sets up, so
 * the example context awareness profiles can only be registered through a boot-time server arg.
 * Declared here because the stateful and all three serverless variants must enable the same set.
 */
const ENABLED_PROFILES = [
  'example-root-profile',
  'example-solution-view-root-profile',
  'example-data-source-profile',
  'example-document-profile',
];

export const discoverContextAwarenessServerArgs = [
  `--discover.experimental.enabledProfiles=${JSON.stringify(ENABLED_PROFILES)}`,
];
