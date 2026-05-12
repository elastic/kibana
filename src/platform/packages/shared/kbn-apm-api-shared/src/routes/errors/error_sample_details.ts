/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { Transaction, APMError } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface ErrorSampleDetailsResponse {
  transaction: Transaction | undefined;
  error: Omit<APMError, 'transaction' | 'error'> & {
    transaction?: { id?: string; type?: string };
    user_agent?: { name?: string; version?: string };
    error: {
      id: string;
    } & Omit<APMError['error'], 'exception' | 'log'> & {
        exception?: APMError['error']['exception'];
        log?: APMError['error']['log'];
      };
  };
}

export const errorSampleDetailsRoute = defineRoute<ErrorSampleDetailsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}',
  params: t.type({
    path: t.type({ serviceName: t.string, groupId: t.string, errorId: t.string }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
});
