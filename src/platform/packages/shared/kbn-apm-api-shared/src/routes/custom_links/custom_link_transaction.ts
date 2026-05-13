/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { Transaction } from '@kbn/apm-types/es_schemas_ui';
import { defineRoute } from '../types';
import { filterOptionsRt } from './custom_link_types';

export type CustomLinkTransactionResponse = Transaction;

export const customLinkTransactionRoute = defineRoute<CustomLinkTransactionResponse>()({
  endpoint: 'GET /internal/apm/settings/custom_links/transaction',
  params: t.partial({
    query: filterOptionsRt,
  }),
});
