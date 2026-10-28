/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';

export interface EchoApi {
  where():
    | Promise<{ threadId: number; isMainThread: boolean; marker: string }>
    | {
        threadId: number;
        isMainThread: boolean;
        marker: string;
      };
}

export const EchoToken = createToken<EchoApi>('demo.echo');
export const DemoCatalogToken = createToken<{
  run(stepType: string, scopeId: string, input: unknown): Promise<unknown>;
}>('demo.catalog');
export const DemoRootToken = createToken<{
  run(request: {
    scopeId: string;
    steps?: Array<{ type: string; with?: unknown }>;
  }): Promise<unknown>;
  block(milliseconds: number): Promise<number>;
}>('demo.root');
export const DemoStepKind = createToken('demo.step');
