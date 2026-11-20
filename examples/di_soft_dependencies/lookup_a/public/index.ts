/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaContainerModule, Logger, OnStart } from '@kbn/core-di';
import { LookupAGreeter } from '@kbn/di-soft-dependencies-example-tokens';
import { LookupStatusService, PLUGIN_ID } from '../common';
import { report } from './report';

const pluginModule = new KibanaContainerModule(({ bind, expose }) => {
  expose(LookupAGreeter).toConstantValue({ greet: () => `hello from ${PLUGIN_ID} browser` });
  bind(LookupStatusService).toSelf().inRequestScope();
  bind(OnStart).toResolvedValue(
    (status, logger) => () => report(logger, status.getStatus()),
    [LookupStatusService, Logger]
  );
});

export { pluginModule as module };
