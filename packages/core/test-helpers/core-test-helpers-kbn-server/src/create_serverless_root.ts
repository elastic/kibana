/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Cluster } from '@kbn/es';
import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

export type TestServerlessESUtils = ReturnType<typeof createServerlessES>;

export const createServerlessES = () => {
  const log = new ToolingLog();
  const cluster = new Cluster({ log });
  return {
    start: async () => {
      await cluster.runServerless();
    },
    stop: async () => {
      // hack to stop the ES cluster
      await execa('docker', ['container stop es01 es02 es03']);
    },
  };
};
