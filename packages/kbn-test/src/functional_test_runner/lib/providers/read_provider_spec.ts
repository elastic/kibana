/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type Providers = ReturnType<typeof readProviderSpec>;
export type Provider = Providers extends Array<infer X> ? X : unknown;

export function readProviderSpec(type: string, providers: Record<string, (...args: any[]) => any>) {
  return Object.keys(providers).map((name) => {
    return {
      type,
      name,
      fn: providers[name],
    };
  });
}
