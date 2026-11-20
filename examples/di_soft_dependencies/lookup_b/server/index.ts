/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { KibanaContainerModule } from '@kbn/core-di';
import { Route } from '@kbn/core-di-server';
import { LookupBGreeter } from '@kbn/di-soft-dependencies-example-tokens';
import { LookupStatusService, PLUGIN_ID } from '../common';
import { StatusRoute } from './route';

export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: true }) }),
};

const pluginModule = new KibanaContainerModule(({ bind, expose }) => {
  expose(LookupBGreeter).toConstantValue({ greet: () => `hello from ${PLUGIN_ID} server` });
  bind(LookupStatusService).toSelf().inRequestScope();
  bind(Route).toConstantValue(StatusRoute);
});

export { pluginModule as module };
