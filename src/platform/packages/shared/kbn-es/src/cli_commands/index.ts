/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { snapshot } from './snapshot';
import { source } from './source';
import { archive } from './archive';
import { buildSnapshots } from './build_snapshots';
import { docker } from './docker';
import { serverless } from './serverless';

export const commands = {
  snapshot,
  source,
  archive,
  build_snapshots: buildSnapshots,
  docker,
  serverless,
};
