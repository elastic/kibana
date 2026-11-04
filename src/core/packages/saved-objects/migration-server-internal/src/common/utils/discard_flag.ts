/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscardObjectsFlag } from '@kbn/core-saved-objects-base-server-internal';

/** Whether a `migrations.discard*Objects` flag is active for the given Kibana version. */
export const isDiscardFlagActive = (flag: DiscardObjectsFlag, kibanaVersion: string): boolean =>
  flag === true || flag === kibanaVersion;

/** Whether a `migrations.discard*Objects` flag is set to a semver that does not match the given Kibana version. */
export const isDiscardFlagMismatched = (flag: DiscardObjectsFlag, kibanaVersion: string): boolean =>
  typeof flag === 'string' && flag !== kibanaVersion;
