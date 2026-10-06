/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { RecentlyAccessed } from './types';
interface StartDeps {
  key: string;
  http: Pick<HttpStart, 'basePath'>;
}
export declare class RecentlyAccessedService {
  start({ http, key }: StartDeps): RecentlyAccessed;
}
export {};
