/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { ChromeNavLinks } from '@kbn/core-chrome-browser';
interface StartDeps {
  application: InternalApplicationStart;
  http: InternalHttpStart;
}
export declare class NavLinksService {
  private readonly stop$;
  start({ application, http }: StartDeps): ChromeNavLinks;
  stop(): void;
}
export {};
