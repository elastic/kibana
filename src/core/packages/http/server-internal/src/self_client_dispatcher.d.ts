/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Dispatcher } from 'undici';
import type { IBasePath } from '@kbn/core-http-server';
import type { HttpConfig } from './http_config';
interface SelfHttpDispatcherProviderParams {
  readonly basePath: IBasePath;
  readonly getHttpConfig: () => HttpConfig;
  readonly target: 'auto' | 'local';
}
export declare class SelfHttpDispatcherProvider {
  private readonly params;
  private readonly dispatchers;
  constructor(params: SelfHttpDispatcherProviderParams);
  get(url: URL, target: 'local' | 'public'): Dispatcher | undefined;
  close(): Promise<void>;
  private replaceDispatcher;
}
export {};
