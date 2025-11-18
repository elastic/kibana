/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { CoreSetup, CapabilitiesProvider } from '@kbn/core-di-server';
import { OnSetup } from '@kbn/core-di';

export function loadCapabilites({ bind, onActivation }: ContainerModuleLoadOptions): void {
  onActivation(CapabilitiesProvider, ({ get }, provider) => {
    get(CoreSetup('capabilities')).registerProvider(provider);

    return provider;
  });

  bind(OnSetup).toConstantValue((container) => {
    container.getAll(CapabilitiesProvider);
  });
}
