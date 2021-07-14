/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { creep } from './creep';

export const convertArchives = () => {
  // TODO: Externalize basePath as a cli arg.
  // const basePath = 'non existing'
  const basePath = 'x-pack/test/functional/es_archives';
  const creepPath = creep(basePath);

  creepPath(
    new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    })
  );
};
