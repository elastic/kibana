/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  justLog,
  parseIndexes,
  logLengthTap,
  isNodeEnvDeclared,
  bulkIngest,
} from './ingest_helpers';

export const ingestList = (log) => (xs) =>
  isNodeEnvDeclared(xs)
    .map(parseIndexes)
    .map(logLengthTap(log)(xs))
    .fold(justLog(log), bulkIngest(log));
