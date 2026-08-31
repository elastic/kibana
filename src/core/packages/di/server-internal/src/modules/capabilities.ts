/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { cacheInScope } from '@kbn/core-di-internal';
import {
  CapabilitiesProvider,
  CapabilitiesResolver,
  CapabilitiesSwitcher,
  CoreSetup,
  CoreStart,
  type ICapabilitiesResolver,
  Request,
} from '@kbn/core-di-server';
import { OnSetup } from '@kbn/core-di';

export function loadCapabilities({ bind, onActivation }: ContainerModuleLoadOptions): void {
  onActivation(CapabilitiesProvider, ({ get }, provider) => {
    get(CoreSetup('capabilities')).registerProvider(provider);

    return provider;
  });

  onActivation(CapabilitiesSwitcher, ({ get }, switcher) => {
    get(CoreSetup('capabilities')).registerSwitcher(switcher.switch, switcher);

    return switcher;
  });

  bind(OnSetup).toConstantValue((container) => {
    container.getAll(CapabilitiesProvider);
    container.getAll(CapabilitiesSwitcher);
  });

  bind(CapabilitiesResolver)
    .toResolvedValue(
      (capabilities, request): ICapabilitiesResolver =>
        (options) =>
          capabilities.resolveCapabilities(request, options),
      [CoreStart('capabilities'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(CapabilitiesResolver));
}
