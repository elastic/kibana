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
import { RegistryAEntry, RegistryBEntry } from '@kbn/di-soft-dependencies-example-tokens';
import { PLUGIN_ID, Registry } from '../common';
import { StatusRoute } from './route';

export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: true }) }),
};

const pluginModule = new KibanaContainerModule(({ bind, collect, expose }) => {
  bind(Registry).toSelf().inSingletonScope();
  collect(RegistryBEntry, Registry, (_context, entry, registry) => registry.register(entry));
  expose(RegistryBEntry).toConstantValue({ id: PLUGIN_ID, label: `built into ${PLUGIN_ID}` });
  expose(RegistryAEntry).toConstantValue({
    id: PLUGIN_ID,
    label: `server entry from ${PLUGIN_ID}`,
  });
  bind(Route).toConstantValue(StatusRoute);
});

export { pluginModule as module };
