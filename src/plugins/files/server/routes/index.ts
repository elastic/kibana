/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilesRouter } from './types';

import * as find from './find';
import * as metrics from './metrics';
import * as publicDownload from './public_facing/download';

export { registerFileKindRoutes } from './file_kind';

export function registerRoutes(router: FilesRouter) {
  [find, metrics, publicDownload].forEach((endpoint) => {
    endpoint.register(router);
  });
}
