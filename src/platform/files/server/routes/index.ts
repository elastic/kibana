/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilesRouter } from './types';

import * as find from './find';
import * as metrics from './metrics';
import * as bulkDelete from './bulk_delete';
import * as publicDownload from './public_facing/download';

export { registerFileKindRoutes } from './file_kind';

export function registerRoutes(router: FilesRouter) {
  [find, metrics, bulkDelete, publicDownload].forEach((endpoint) => {
    endpoint.register(router);
  });
}
