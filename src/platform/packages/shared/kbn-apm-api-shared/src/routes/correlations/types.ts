/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';

export const correlationsTransactionQueryRt = t.partial({
  serviceName: t.string,
  transactionName: t.string,
  transactionType: t.string,
});

export const entityTypeRt = t.union([t.literal('transaction'), t.literal('exit_span')]);

export const metricRt = t.union([t.literal('latency'), t.literal('failure_rate')]);
