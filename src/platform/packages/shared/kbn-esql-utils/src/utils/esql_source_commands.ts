/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL source commands supported by utilities in this package.
 *
 * Note: ES|QL must start with a source command, and `PROMQL` is represented
 * as a source command in the ES|QL parser.
 */
export enum EsqlSourceCommand {
  From = 'from',
  Row = 'row',
  Show = 'show',
  Ts = 'ts',
  Promql = 'promql',
}
