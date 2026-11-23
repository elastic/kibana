/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { getKibanaDir } from './get_kibana_dir.ts';

let requireKibana: ReturnType<typeof createRequire> | undefined;
let environmentLoaded = false;

/**
 * Loads package IDs normally. Requests beginning with `./` are resolved relative
 * to the repository-root package.json used to create the CommonJS loader.
 */
export const loadKibanaModule = <T>(request: string): T => {
  requireKibana ??= createRequire(resolve(getKibanaDir(), 'package.json'));

  if (!environmentLoaded) {
    requireKibana('@kbn/setup-node-env');
    environmentLoaded = true;
  }

  return requireKibana(request) as T;
};
