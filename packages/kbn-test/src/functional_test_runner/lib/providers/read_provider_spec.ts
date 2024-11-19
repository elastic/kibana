/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GenericFtrService } from '../../public_types';

export type ProviderConstructor = new (...args: any[]) => any;
export type ProviderFactory = (...args: any[]) => any;

export function isProviderConstructor(x: unknown): x is ProviderConstructor {
  return typeof x === 'function' && x.prototype instanceof GenericFtrService;
}

export type ProviderFn = ProviderConstructor | ProviderFactory;
export type Providers = ReturnType<typeof readProviderSpec>;
export type Provider = Providers extends Array<infer X> ? X : unknown;

export function readProviderSpec(type: string, providers: Record<string, ProviderFn>) {
  return Object.keys(providers).map((name) => {
    return {
      type,
      name,
      fn: providers[name],
    };
  });
}
