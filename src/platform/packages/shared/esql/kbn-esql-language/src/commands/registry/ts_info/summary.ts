/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLCommandSummary } from '../types';
import { TS_INFO_FIELDS } from './columns_after';

export const summary = (_command: ESQLCommand): ESQLCommandSummary => {
  return { newColumns: new Set(TS_INFO_FIELDS.map(({ name }) => name)) };
};
