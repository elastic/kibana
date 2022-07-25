/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { TablesAdapter } from './tables_adapter';
import { ExpressionsInspectorAdapter } from './expressions_inspector_adapter';

import type { DefaultInspectorAdapters } from '../execution';

export const createDefaultInspectorAdapters = (): DefaultInspectorAdapters => ({
  requests: new RequestAdapter(),
  tables: new TablesAdapter(),
  expression: new ExpressionsInspectorAdapter(),
});
