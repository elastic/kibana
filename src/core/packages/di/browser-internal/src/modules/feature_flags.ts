/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { CoreStart, FeatureFlags } from '@kbn/core-di-browser';

export function loadFeatureFlags({ bind }: ContainerModuleLoadOptions): void {
  // TODO: IFeatureFlags omits appendContext in the type but at runtime it's still on
  // the object. I think it's safe but wanted to raise the question (same applies to
  // other adapters)
  bind(FeatureFlags).toService(CoreStart('featureFlags'));
}
