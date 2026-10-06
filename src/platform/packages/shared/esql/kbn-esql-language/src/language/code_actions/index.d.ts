/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { QuickFixMessage } from './types';
export interface EsqlCodeAction {
  title: string;
  fixedText: string;
}
/**
 * Computes the quick-fix code actions associated with an ESQLMessage.
 */
export declare function getQuickFixesForMessage({
  queryString,
  message,
  callbacks,
}: {
  queryString: string;
  message: QuickFixMessage;
  callbacks?: ESQLCallbacks;
}): Promise<EsqlCodeAction[]>;
