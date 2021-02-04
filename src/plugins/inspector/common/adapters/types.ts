/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataAdapter } from './data';
import type { RequestAdapter } from './request';

/**
 * The interface that the adapters used to open an inspector have to fullfill.
 */
export interface Adapters {
  data?: DataAdapter;
  requests?: RequestAdapter;
  [key: string]: any;
}
