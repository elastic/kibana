/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Adapters } from './inspector';

export interface Trigger {
  id: string;
  title?: string;
  description?: string;
}

export interface PropertySpec {
  displayName: string;
  accessPath: string;
  id: string;
  description: string;
  value?: string;
}
export { ViewMode } from '../../common/types';
export type { Adapters };
