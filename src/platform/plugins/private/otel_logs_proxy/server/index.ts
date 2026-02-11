/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { OnSetup } from '@kbn/core-di';
import { Route, PluginInitializer } from '@kbn/core-di-server';
import { ProxyRoute } from './route';
import { Queue } from './queue';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  url: schema.conditional(schema.siblingRef('enabled'), false, schema.never(), schema.string()),
  period: schema.number({ defaultValue: 15000 }),
});

export const module = new ContainerModule(({ bind, onDeactivation }) => {
  let interval: NodeJS.Timeout | undefined;
  bind(Route).toConstantValue(ProxyRoute);
  bind(Queue).toSelf().inSingletonScope();
  bind(OnSetup).toConstantValue((container) => {
    const queue = container.get(Queue);
    const config = container.get(PluginInitializer('config')).get() as ConfigType;

    if (config.enabled) {
      interval = setInterval(() => queue.flush(), config.period);
    }
  });
  onDeactivation(OnSetup, () => {
    if (interval) {
      clearInterval(interval);
    }
  });
});

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
};

export type ConfigType = TypeOf<typeof configSchema>;
