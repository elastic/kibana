/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaContainerModule, Logger, OnExtensionsReady } from '@kbn/core-di';
import { RegistryAEntry, RegistryBEntry } from '@kbn/di-soft-dependencies-example-tokens';
import { PLUGIN_ID, Registry } from '../common';
import { report } from './report';

const pluginModule = new KibanaContainerModule(({ bind, extensions }) => {
  bind(Registry).toSelf().inSingletonScope();
  extensions.collect(RegistryAEntry, Registry, (_context, entry, registry) =>
    registry.register(entry)
  );
  extensions
    .contribute(RegistryAEntry)
    .toConstantValue({ id: PLUGIN_ID, label: `built into ${PLUGIN_ID}` });
  extensions.contribute(RegistryBEntry).toConstantValue({
    id: PLUGIN_ID,
    label: `browser entry from ${PLUGIN_ID}`,
  });
  bind(OnExtensionsReady).toResolvedValue(
    (registry, logger) => () => report(logger, registry.getStatus()),
    [Registry, Logger]
  );
});

export { pluginModule as module };
