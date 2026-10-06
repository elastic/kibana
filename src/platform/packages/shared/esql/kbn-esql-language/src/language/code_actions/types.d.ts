/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLMessage } from '../../commands/definitions/types';
export interface QuickFixMessage {
  code: ESQLMessage['code'];
  data?: ESQLMessage['data'];
  location?: ESQLMessage['location'];
  startLineNumber?: number;
  startColumn?: number;
  endLineNumber?: number;
  endColumn?: number;
}
export interface QuickFix {
  title: string;
  fixQuery: (query: string) => string | undefined;
  displayCondition?: (query: string, callbacks: ESQLCallbacks) => Promise<boolean>;
}
